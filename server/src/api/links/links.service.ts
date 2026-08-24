import { Injectable } from '@nestjs/common';
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

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
    private readonly embeddingService: EmbeddingService,
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

    const link = this.linkRepository.create({
      userId,
      url: dto.url,
      source,
      title,
      category: dto.category ?? null,
      thumbnailUrl,
    });
    const saved = await this.linkRepository.save(link);

    // v1 prototype: only YouTube links get embedded/semantically searchable.
    // Best-effort — a failed/slow embed can never fail or delay link
    // creation, so the saved link is returned regardless of the outcome.
    if (source === 'youtube') {
      const embedding = await this.embeddingService.embed(
        buildEmbeddingInput({
          title,
          authorName: youtubeAuthorName,
          category: dto.category ?? null,
        }),
      );
      if (embedding) {
        await this.linkRepository.query(
          `UPDATE links SET embedding = $1::vector WHERE id = $2`,
          [`[${embedding.join(',')}]`, saved.id],
        );
      }
    }

    return saved;
  }

  async findAll(
    userId: string,
    opts?: {
      search?: string;
      source?: LinkSource;
      category?: string;
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

    const embedding = await this.embeddingService.embed(query);
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
    const vectorLiteral = `[${embedding.join(',')}]`;
    return this.linkRepository
      .createQueryBuilder('link')
      .where('link.user_id = :userId', { userId })
      .andWhere('link.embedding IS NOT NULL')
      .orderBy('link.embedding <=> CAST(:embedding AS vector)')
      .setParameter('embedding', vectorLiteral)
      .take(clampedLimit)
      .getMany();
  }

  // Not wired to any route yet — for a future scheduled task or admin
  // endpoint. Scoped to YouTube for this prototype; relax/generalize the
  // source filter as other platforms get their own embedding-input fetchers.
  async backfillMissingEmbeddings(batchSize = 50): Promise<number> {
    const links = await this.linkRepository
      .createQueryBuilder('link')
      .where('link.source = :source', { source: 'youtube' })
      .andWhere('link.embedding IS NULL')
      .take(batchSize)
      .getMany();

    let updated = 0;
    for (const link of links) {
      const oembed = await fetchYoutubeOembed(link.url);
      const embedding = await this.embeddingService.embed(
        buildEmbeddingInput({
          title: link.title,
          authorName: oembed?.authorName ?? null,
          category: link.category,
        }),
      );
      if (embedding) {
        await this.linkRepository.query(
          `UPDATE links SET embedding = $1::vector WHERE id = $2`,
          [`[${embedding.join(',')}]`, link.id],
        );
        updated++;
      }
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
