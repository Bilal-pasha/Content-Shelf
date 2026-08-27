import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from 'youtube-transcript';

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
 * Never throws. Returns a discriminated result so the caller can tell a
 * video that genuinely has no captions ('no-captions', an expected outcome
 * for silent/music/text-overlay Shorts) apart from a transient failure
 * ('rate-limited', 'error') that is worth retrying later.
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

export type TranscriptResult =
  | { text: string; reason?: undefined }
  | {
      text: null;
      reason:
        | 'no-id'
        | 'no-captions'
        | 'rate-limited'
        | 'unavailable'
        | 'error';
    };

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
): Promise<TranscriptResult> {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return { text: null, reason: 'no-id' };

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, {
      fetch: timeoutFetch,
    });

    const text = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 0
      ? { text: text.slice(0, MAX_TRANSCRIPT_CHARS) }
      : { text: null, reason: 'no-captions' };
  } catch (err) {
    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      return { text: null, reason: 'rate-limited' };
    }
    if (
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError ||
      err instanceof YoutubeTranscriptNotAvailableLanguageError
    ) {
      return { text: null, reason: 'no-captions' };
    }
    if (err instanceof YoutubeTranscriptVideoUnavailableError) {
      return { text: null, reason: 'unavailable' };
    }
    console.warn('fetchYoutubeTranscript unexpected error:', err);
    return { text: null, reason: 'error' };
  }
}
