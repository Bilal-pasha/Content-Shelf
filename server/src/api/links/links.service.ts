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
import { fetchYoutubeTranscript } from './utils/youtube-transcript.util';
import { EmbeddingService, buildEmbeddingInput } from './embedding.service';
import { CategorizationService } from './categorization.service';
import { SummarizationService } from './summarization.service';
import { FoldersService } from '../folders/folders.service';
import { capitalize } from '../folders/folder-defaults';

// Cosine distance (`<=>`) ranges 0 (identical) to 2 (opposite). Now that the
// document side embeds a transcript summary rather than a ~5-word title,
// genuinely related query/document pairs sit meaningfully closer, so this
// cutoff can be a touch more generous than the old title-only 0.5 without
// letting in noise. Tune against a fixed set of real queries.
const MAX_SEMANTIC_DISTANCE = 0.6;

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly embeddingService: EmbeddingService,
    private readonly categorizationService: CategorizationService,
    private readonly summarizationService: SummarizationService,
    private readonly foldersService: FoldersService,
  ) {}

  private readonly logger = new Logger(LinksService.name);

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

    // v1 prototype: only YouTube links get embedded/semantically searchable.
    // Fired and NOT awaited — fetching the transcript and summarising it can
    // take several seconds, and the share sheet is waiting on this response.
    // indexYoutubeLink owns all its own error handling and never throws.
    if (source === 'youtube') {
      void this.indexYoutubeLink(saved.id, {
        url: dto.url,
        title,
        authorName: youtubeAuthorName,
        category,
      });
    }

    return saved;
  }

  /**
   * Transcript -> summary -> embedding pass for one YouTube link, run in the
   * background after the link is saved. Every step is best-effort: no
   * transcript falls back to embedding title/author, a failed embed leaves
   * the existing vector untouched, and any throw is caught and recorded as
   * transcript_status = 'failed' for a later retry.
   */
  private async indexYoutubeLink(
    linkId: string,
    meta: {
      url: string;
      title: string | null;
      authorName: string | null;
      category: string | null;
    },
  ): Promise<void> {
    try {
      const transcript = await fetchYoutubeTranscript(meta.url);

      let summary: string | null = null;
      if (transcript) {
        summary = await this.summarizationService.summarize({
          title: meta.title,
          authorName: meta.authorName,
          transcript,
        });
      }

      const embedding = await this.embeddingService.embed(
        buildEmbeddingInput({
          title: meta.title,
          authorName: meta.authorName,
          category: meta.category,
          summary,
        }),
      );

      await this.linkRepository.query(
        `UPDATE links
            SET summary = $1,
                transcript_status = $2,
                embedding = COALESCE($3::vector, embedding)
          WHERE id = $4`,
        [
          summary,
          transcript ? 'ok' : 'no_transcript',
          embedding ? `[${embedding.join(',')}]` : null,
          linkId,
        ],
      );
    } catch (err) {
      this.logger.warn(`indexYoutubeLink failed for ${linkId}: ${String(err)}`);
      await this.linkRepository
        .query(`UPDATE links SET transcript_status = 'failed' WHERE id = $1`, [
          linkId,
        ])
        .catch(() => undefined);
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

    // No explicit `source = 'youtube'` filter here — deliberately. Only
    // YouTube links get an embedding in this v1 prototype, so the
    // `embedding IS NOT NULL` filter already scopes results to YouTube by
    // construction. This keeps searchSemantic platform-agnostic so adding
    // other platforms later requires no change to this method.
    //
    // The MAX_SEMANTIC_DISTANCE cutoff keeps a query with no good matches
    // from returning its closest-available links ranked as if relevant.
    const vectorLiteral = `[${embedding.join(',')}]`;
    return this.linkRepository
      .createQueryBuilder('link')
      .where('link.user_id = :userId', { userId })
      .andWhere('link.embedding IS NOT NULL')
      .andWhere('link.embedding <=> CAST(:embedding AS vector) < :maxDistance')
      .orderBy('link.embedding <=> CAST(:embedding AS vector)')
      .setParameter('embedding', vectorLiteral)
      .setParameter('maxDistance', MAX_SEMANTIC_DISTANCE)
      .take(clampedLimit)
      .getMany();
  }

  // Not wired to any route yet — for a future scheduled task or admin
  // endpoint. Scoped to YouTube for this prototype; relax/generalize the
  // source filter as other platforms get their own embedding-input fetchers.
  // Picks up rows that were never indexed (embedding IS NULL) as well as
  // ones whose earlier pass failed (transcript_status = 'failed').
  async backfillMissingEmbeddings(batchSize = 50): Promise<number> {
    const links = await this.linkRepository
      .createQueryBuilder('link')
      .where('link.source = :source', { source: 'youtube' })
      .andWhere(
        '(link.embedding IS NULL OR link.transcript_status = :failed)',
        { failed: 'failed' },
      )
      .take(batchSize)
      .getMany();

    let updated = 0;
    for (const link of links) {
      const oembed = await fetchYoutubeOembed(link.url);
      await this.indexYoutubeLink(link.id, {
        url: link.url,
        title: link.title,
        authorName: oembed?.authorName ?? null,
        category: link.category,
      });
      updated++;
    }
    return updated;
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
