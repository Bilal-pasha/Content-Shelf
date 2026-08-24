import { safeFetch } from '../../../common/security/ssrf-guard';

/**
 * YouTube (and Shorts) often don't expose og:image to server-side fetch.
 * Derive thumbnail from video ID when URL is youtube.com/watch, youtube.com/shorts, or youtu.be.
 */
const YOUTUBE_VIDEO_ID_REGEX =
  /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;

export function getYoutubeThumbnailUrl(url: string): string | null {
  const match = url.match(YOUTUBE_VIDEO_ID_REGEX);
  if (!match?.[1]) return null;
  const videoId = match[1];
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * YouTube's public oEmbed endpoint returns title/author_name for any public
 * video — more reliable than OG scraping and gives us author_name for free
 * (used to enrich semantic search embedding text).
 */
export async function fetchYoutubeOembed(url: string): Promise<{
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await safeFetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title ?? null,
      authorName: data.author_name ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

/** Browser-like User-Agent to improve OG/thumbnail fetch for Instagram, Facebook, etc. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Try Instagram oEmbed for thumbnail (may still return thumbnail_url on some endpoints).
 * Falls back to extracting from HTML if oEmbed fails.
 */
export async function getInstagramThumbnailUrl(
  url: string,
): Promise<string | null> {
  if (!/instagram\.com|instagr\.am/i.test(url)) return null;

  // Try oEmbed first (works for some public posts)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await safeFetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = (await res.json()) as { thumbnail_url?: string };
      const href = data?.thumbnail_url;
      if (typeof href === 'string' && href.startsWith('http')) return href;
    }
  } catch {
    // Continue to fallback method
  }

  // Fallback: Try to extract from HTML meta tags
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Try multiple meta tag patterns
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const href = match[1].trim();
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Extract Facebook video thumbnail from URL or meta tags
 */
export async function getFacebookThumbnailUrl(
  url: string,
): Promise<string | null> {
  if (!/facebook\.com|fb\.watch|fb\.com/i.test(url)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Try multiple meta tag patterns for Facebook
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:video:thumbnail["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const href = match[1].trim();
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Extract LinkedIn video/post thumbnail from URL or meta tags
 */
export async function getLinkedInThumbnailUrl(
  url: string,
): Promise<string | null> {
  if (!/linkedin\.com/i.test(url)) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Try multiple meta tag patterns for LinkedIn
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const href = match[1].trim();
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Fetch Open Graph metadata (og:image, og:title) from a URL.
 * Uses a browser-like User-Agent so Instagram/Facebook are more likely to return full HTML with og:image.
 */
export async function fetchOgMetadata(url: string): Promise<{
  thumbnailUrl: string | null;
  title: string | null;
}> {
  const result = {
    thumbnailUrl: null as string | null,
    title: null as string | null,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return result;

    const html = await res.text();

    const ogImageMatch =
      html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      );
    if (ogImageMatch?.[1]) {
      const href = ogImageMatch[1].trim();
      if (href.startsWith('http')) result.thumbnailUrl = href;
      else if (href.startsWith('//')) result.thumbnailUrl = `https:${href}`;
    }

    const ogTitleMatch =
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      );
    if (ogTitleMatch?.[1]) {
      result.title = ogTitleMatch[1].trim().slice(0, 500) || null;
    }
  } catch {
    // Ignore fetch/parse errors; caller proceeds without metadata
  }

  return result;
}
