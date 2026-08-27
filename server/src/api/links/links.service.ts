import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link, LinkSource } from './link.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import {
  fetchOgMetadata,
  fetchYoutubeOembed,
  getYoutubeThumbnailUrl,
  getInstagramThumbnailUrl,
  getFacebookThumbnailUrl,
  getLinkedInThumbnailUrl,
} from './utils/og-metadata.util';
import { EmbeddingService, buildEmbeddingInput } from './embedding.service';
import { CategorizationService } from './categorization.service';
import {
  QueryGenerationService,
  LinkMetaForQueries,
} from './query-generation.service';
import { FoldersService } from '../folders/folders.service';
import { capitalize } from '../folders/folder-defaults';

// Cosine distance (`<=>`) ranges 0 (identical) to 2 (opposite). A link is
// scored by its closest-matching search vector; below this cutoff counts as
// "actually related". Tune against a fixed set of real queries.
const MAX_SEMANTIC_DISTANCE = 0.55;

// Seed metadata passed to the background indexer — whatever create() (or the
// backfill) already knows; indexLink enriches the rest off the hot path.
interface IndexSeed {
  source: LinkSource;
  url: string;
  title: string | null;
  authorName: string | null;
  category: string | null;
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly embeddingService: EmbeddingService,
    private readonly categorizationService: CategorizationService,
    private readonly queryGenerationService: QueryGenerationService,
    private readonly foldersService: FoldersService,
  ) {}

  async create(userId: string, dto: CreateLinkDto): Promise<Link> {
    const source = dto.source ?? this.inferSource(dto.url);
    let title = dto.title ?? null;
    let thumbnailUrl = dto.thumbnailUrl ?? null;
    let youtubeAuthorName: string | null = null;

    // YouTube's oEmbed endpoint is more reliable than generic OG scraping
    // and gives us author_name for free (used to enrich the embedding text
    // below), so it's tried first for YouTube links.
    if (source === 'youtube') {
      const oembed = await fetchYoutubeOembed(dto.url);
      if (oembed) {
        if (!title && oembed.title) title = oembed.title;
        if (!thumbnailUrl && oembed.thumbnailUrl)
          thumbnailUrl = oembed.thumbnailUrl;
        youtubeAuthorName = oembed.authorName;
      }
    }

    if (!thumbnailUrl || !title) {
      const og = await fetchOgMetadata(dto.url);
      if (!thumbnailUrl && og.thumbnailUrl) thumbnailUrl = og.thumbnailUrl;
      if (!title && og.title) title = og.title;
    }
    // Platform-specific thumbnail fallbacks when OG returns nothing
    if (!thumbnailUrl) {
      const ytThumb = getYoutubeThumbnailUrl(dto.url);
      if (ytThumb) thumbnailUrl = ytThumb;
    }
    if (!thumbnailUrl && /instagram\.com|instagr\.am/i.test(dto.url)) {
      const igThumb = await getInstagramThumbnailUrl(dto.url);
      if (igThumb) thumbnailUrl = igThumb;
    }
    if (!thumbnailUrl && /facebook\.com|fb\.watch|fb\.com/i.test(dto.url)) {
      const fbThumb = await getFacebookThumbnailUrl(dto.url);
      if (fbThumb) thumbnailUrl = fbThumb;
    }
    if (!thumbnailUrl && /linkedin\.com/i.test(dto.url)) {
      const liThumb = await getLinkedInThumbnailUrl(dto.url);
      if (liThumb) thumbnailUrl = liThumb;
    }

    // Auto-categorize when the client didn't supply one (the share flow
    // never does). Best-effort — a failed classification just stores null.
    const category =
      dto.category ??
      (await this.categorizationService.categorize({
        title,
        url: dto.url,
        source,
      }));

    // Resolve the target folder: an explicit id (verified to belong to the
    // user) wins; otherwise a name is matched case-insensitively or created
    // on the fly with category-derived icon/color.
    let folderId: string | null = null;
    if (
      dto.folderId &&
      (await this.foldersService.exists(userId, dto.folderId))
    ) {
      folderId = dto.folderId;
    } else if (dto.folderName?.trim()) {
      folderId = await this.foldersService.findOrCreate(
        userId,
        dto.folderName.trim(),
        category,
      );
    }

    const link = this.linkRepository.create({
      userId,
      url: dto.url,
      source,
      title,
      category: category ?? null,
      thumbnailUrl,
      folderId,
    });
    const saved = await this.linkRepository.save(link);

    // Build the semantic-search index for this link in the background. Fired
    // and NOT awaited: it makes an LLM call plus a batch-embed round trip
    // (seconds), and the share sheet is waiting on this response. indexLink
    // owns all its error handling and never throws.
    void this.indexLink(saved.id, {
      source,
      url: dto.url,
      title,
      authorName: youtubeAuthorName,
      category,
    });

    return saved;
  }

  /**
   * doc2query indexing for one link, run in the background after save.
   * Enriches metadata (oEmbed author/url, og:description) off the hot path,
   * asks the LLM for likely search phrases, embeds those plus a canonical
   * metadata row in one batch, and replaces the link's rows in
   * link_search_vectors. Best-effort: any failure is logged and the link is
   * simply left unindexed (searchSemantic still has the ILIKE fallback).
   */
  private async indexLink(linkId: string, seed: IndexSeed): Promise<void> {
    try {
      let title = seed.title;
      let authorName = seed.authorName;
      let authorUrl: string | null = null;

      if (seed.source === 'youtube') {
        const oembed = await fetchYoutubeOembed(seed.url);
        if (oembed) {
          title ??= oembed.title;
          authorName ??= oembed.authorName;
          authorUrl = oembed.authorUrl;
        }
      }

      const og = await fetchOgMetadata(seed.url);
      title ??= og.title;
      const description = og.description;

      const meta: LinkMetaForQueries = {
        source: seed.source,
        title,
        authorName,
        authorUrl,
        description,
        category: seed.category,
        url: seed.url,
      };

      const canonical = buildEmbeddingInput({
        title,
        authorName,
        description,
        category: seed.category,
      });
      const queries = await this.queryGenerationService.generate(meta);

      const rows: { kind: string; text: string }[] = [];
      if (canonical) rows.push({ kind: 'canonical', text: canonical });
      for (const q of queries) rows.push({ kind: 'generated_query', text: q });
      if (rows.length === 0) return;

      const vectors = await this.embeddingService.embedBatch(
        rows.map((r) => r.text),
      );
      if (!vectors) return;

      const embedded = rows
        .map((r, i) => ({ ...r, vec: vectors[i] }))
        .filter((r): r is { kind: string; text: string; vec: number[] } =>
          Array.isArray(r.vec),
        );
      if (embedded.length === 0) return;

      await this.linkRepository.manager.transaction(async (trx) => {
        await trx.query(`DELETE FROM link_search_vectors WHERE link_id = $1`, [
          linkId,
        ]);
        const tuples: string[] = [];
        const params: unknown[] = [linkId];
        embedded.forEach((r, i) => {
          const b = i * 3;
          tuples.push(`($1, $${b + 2}, $${b + 3}, $${b + 4}::vector)`);
          params.push(r.kind, r.text, `[${r.vec.join(',')}]`);
        });
        await trx.query(
          `INSERT INTO link_search_vectors (link_id, kind, text, embedding)
           VALUES ${tuples.join(', ')}`,
          params,
        );
      });
    } catch (err) {
      this.logger.warn(`indexLink failed for ${linkId}: ${String(err)}`);
    }
  }

  /**
   * Powers the "suggested folder" preselection in the share sheet: fetch
   * just enough metadata to auto-detect a category, then map that to one of
   * the user's existing folders (if any). Returns a display name to prefill
   * the "New folder" field when there's no match yet. Best-effort — any
   * failure yields nulls and the sheet simply opens with nothing preselected.
   */
  async suggestFolder(
    userId: string,
    url: string,
  ): Promise<{
    category: string | null;
    folderId: string | null;
    folderName: string | null;
  }> {
    const source = this.inferSource(url);

    let title: string | null = null;
    if (source === 'youtube') {
      const oembed = await fetchYoutubeOembed(url);
      title = oembed?.title ?? null;
    }
    if (!title) {
      const og = await fetchOgMetadata(url);
      title = og.title;
    }

    const category = await this.categorizationService.categorize({
      title,
      url,
      source,
    });
    if (!category) {
      return { category: null, folderId: null, folderName: null };
    }

    const folder = await this.foldersService.findByName(userId, category);
    return {
      category,
      folderId: folder?.id ?? null,
      folderName: folder?.name ?? capitalize(category),
    };
  }

  async findAll(
    userId: string,
    opts?: {
      search?: string;
      source?: LinkSource;
      category?: string;
      folderId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Link[]> {
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .where('link.user_id = :userId', { userId })
      .orderBy('link.created_at', 'DESC');

    if (opts?.source) {
      qb.andWhere('link.source = :source', { source: opts.source });
    }

    if (opts?.folderId?.trim()) {
      qb.andWhere('link.folder_id = :folderId', {
        folderId: opts.folderId.trim(),
      });
    }

    if (opts?.category?.trim()) {
      qb.andWhere('link.category = :category', {
        category: opts.category.trim(),
      });
    }

    if (opts?.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      qb.andWhere('(link.url ILIKE :term OR link.title ILIKE :term)', { term });
    }

    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
    const offset = Math.max(opts?.offset ?? 0, 0);
    qb.skip(offset).take(limit);

    const links = await qb.getMany();

    // Backfill thumbnails for links where OG/platform fetch previously
    // failed. Only for rows that need it, and in parallel rather than a
    // sequential loop — this used to be N sequential outbound round trips
    // inside a single GET request.
    await Promise.allSettled(
      links
        .filter((link) => !link.thumbnailUrl)
        .map(async (link) => {
          const yt = getYoutubeThumbnailUrl(link.url);
          if (yt) {
            link.thumbnailUrl = yt;
          } else if (/instagram\.com|instagr\.am/i.test(link.url)) {
            const ig = await getInstagramThumbnailUrl(link.url);
            if (ig) link.thumbnailUrl = ig;
          } else if (/facebook\.com|fb\.watch|fb\.com/i.test(link.url)) {
            const fb = await getFacebookThumbnailUrl(link.url);
            if (fb) link.thumbnailUrl = fb;
          } else if (/linkedin\.com/i.test(link.url)) {
            const li = await getLinkedInThumbnailUrl(link.url);
            if (li) link.thumbnailUrl = li;
          }
        }),
    );

    return links;
  }

  async searchSemantic(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<Link[]> {
    const clampedLimit = Math.min(Math.max(limit, 1), 100);

    const embedding = await this.embeddingService.embed(query, {
      isQuery: true,
    });
    if (!embedding) {
      // Embedding failed — never leave the user with zero results just
      // because the embedding call failed.
      return this.findAll(userId, { search: query, limit: clampedLimit });
    }

    // Score each link by its closest-matching row in link_search_vectors
    // (the canonical metadata row plus the LLM-generated query phrases).
    // INNER JOIN + the distance filter already scope results to links that
    // have an index and at least one row under the cutoff.
    const vectorLiteral = `[${embedding.join(',')}]`;
    return this.linkRepository
      .createQueryBuilder('link')
      .innerJoin('link_search_vectors', 'v', 'v.link_id = link.id')
      .where('link.user_id = :userId', { userId })
      .andWhere('v.embedding <=> CAST(:embedding AS vector) < :maxDistance')
      .groupBy('link.id')
      .orderBy('MIN(v.embedding <=> CAST(:embedding AS vector))', 'ASC')
      .setParameter('embedding', vectorLiteral)
      .setParameter('maxDistance', MAX_SEMANTIC_DISTANCE)
      .limit(clampedLimit)
      .getMany();
  }

  // Not wired to any route yet — for a future scheduled task or admin
  // endpoint. Re-runs the doc2query indexer for links that have no rows in
  // link_search_vectors yet (e.g. saved before this feature, or where the
  // background pass failed).
  async backfillLinkVectors(batchSize = 50): Promise<number> {
    const links = await this.linkRepository
      .createQueryBuilder('link')
      .leftJoin('link_search_vectors', 'v', 'v.link_id = link.id')
      .where('v.id IS NULL')
      .take(batchSize)
      .getMany();

    for (const link of links) {
      await this.indexLink(link.id, {
        source: link.source,
        url: link.url,
        title: link.title,
        authorName: null,
        category: link.category,
      });
    }
    return links.length;
  }

  private inferSource(url: string): LinkSource {
    const u = url.toLowerCase();
    if (u.includes('instagram.com') || u.includes('instagr.am'))
      return 'instagram';
    if (
      u.includes('facebook.com') ||
      u.includes('fb.com') ||
      u.includes('fb.me') ||
      u.includes('fb.watch')
    )
      return 'facebook';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('linkedin.com')) return 'linkedin';
    return 'other';
  }
}
