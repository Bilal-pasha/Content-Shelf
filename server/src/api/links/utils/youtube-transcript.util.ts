import { YoutubeTranscript, YoutubeTranscriptError } from 'youtube-transcript';

/**
 * Best-effort fetch of a YouTube video's caption text (auto-generated or
 * uploaded), used to give semantic search real content to embed instead of
 * just the title.
 *
 * Delegates to the `youtube-transcript` package, which hits YouTube's
 * InnerTube API (Android client context) with an HTML-scrape fallback and
 * keeps up with YouTube's anti-scraping changes — a hand-rolled watch-page
 * scrape no longer works (the caption `baseUrl` now needs a proof-of-origin
 * token).
 *
 * Returns null on any failure — no captions, captions disabled, rate
 * limited, video unavailable — and never throws. No language is requested,
 * so whatever track YouTube returns is used (a non-English transcript still
 * embeds fine; the embedding model is multilingual).
 *
 * SSRF: the library fetches only fixed youtube.com / googleapis.com hosts,
 * so the URL is not attacker-controlled and doesn't go through safeFetch.
 * We inject a fetch wrapper purely to bound each request with a timeout.
 */

const YOUTUBE_VIDEO_ID_REGEX =
  /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;

const REQUEST_TIMEOUT_MS = 10000;
// A long video's transcript is mostly filler for our purposes and the
// summarizer truncates anyway; keep memory/logs bounded.
const MAX_TRANSCRIPT_CHARS = 20000;

export function getYoutubeVideoId(url: string): string | null {
  return url.match(YOUTUBE_VIDEO_ID_REGEX)?.[1] ?? null;
}

const timeoutFetch = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
};

export async function fetchYoutubeTranscript(
  url: string,
): Promise<string | null> {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      fetch: timeoutFetch,
    });

    const text = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 0 ? text.slice(0, MAX_TRANSCRIPT_CHARS) : null;
  } catch (err) {
    // Typed errors from the library (disabled, unavailable, rate limited, no
    // captions) are all expected "no transcript" outcomes. Anything else is
    // swallowed too so indexing falls back to title-only embedding.
    if (!(err instanceof YoutubeTranscriptError)) {
      console.warn('fetchYoutubeTranscript unexpected error:', err);
    }
    return null;
  }
}
