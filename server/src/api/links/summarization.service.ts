import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
const DEEPINFRA_CHAT_URL =
  'https://api.deepinfra.com/v1/openai/chat/completions';

// Transcripts run long and cost per token; the first few thousand characters
// carry more than enough topic signal for a search-index summary.
const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_SUMMARY_CHARS = 2000;

@Injectable()
export class SummarizationService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(SummarizationService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Condense a video transcript into a single dense paragraph describing what
   * the video is actually about — the text that then gets embedded for
   * semantic search. Best-effort: returns null when the API key is missing,
   * the transcript is empty, or the request fails. Never throws.
   */
  async summarize(input: {
    title: string | null;
    authorName: string | null;
    transcript: string;
  }): Promise<string | null> {
    const apiKey = this.configService.get<string>('DEEPINFRA_API_KEY');
    if (!apiKey) return null;

    const transcript = input.transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS);
    if (!transcript) return null;

    const prompt =
      `You are indexing a short video for a personal search tool. ` +
      `Write ONE dense paragraph of at most 100 words describing what the ` +
      `video is about: its topic, the key points made, any named people, ` +
      `products, places or works, and any question it answers. Use only ` +
      `information present below. No preamble, no opinions, no bullet points.\n\n` +
      `Title: ${input.title ?? 'unknown'}\n` +
      `Channel: ${input.authorName ?? 'unknown'}\n` +
      `Transcript:\n${transcript}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(DEEPINFRA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 220,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Summarization request failed',
        );
        return null;
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return null;

      const summary = content.trim();
      return summary.length > 0 ? summary.slice(0, MAX_SUMMARY_CHARS) : null;
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Summarization request threw');
      return null;
    }
  }
}
