import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Link, LinkSource } from './link.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import {
  fetchOgMetadata,
  getYoutubeThumbnailUrl,
  getInstagramThumbnailUrl,
  getFacebookThumbnailUrl,
  getLinkedInThumbnailUrl,
} from './utils/og-metadata.util';

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly linkRepository: Repository<Link>,
  ) {}

  async create(userId: string, dto: CreateLinkDto): Promise<Link> {
    const source = dto.source ?? this.inferSource(dto.url);
    let title = dto.title ?? null;
    let thumbnailUrl = dto.thumbnailUrl ?? null;

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
    return this.linkRepository.save(link);
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
