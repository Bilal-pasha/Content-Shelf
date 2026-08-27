import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { LinkSource } from './link.entity';

const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
const DEEPINFRA_CHAT_URL =
  'https://api.deepinfra.com/v1/openai/chat/completions';

// Kept in sync with CATEGORIES in dto/create-link.dto.ts — the classifier is
// only allowed to pick from this closed set, anything else falls back to null.
export const CATEGORIES = [
  'nature',
  'cooking',
  'food',
  'sports',
  'music',
  'tech',
  'entertainment',
  'other',
] as const;

export type LinkCategory = (typeof CATEGORIES)[number];

@Injectable()
export class CategorizationService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(CategorizationService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Best-effort content categorization from whatever metadata we already
   * resolved (title, source, url). Returns null when the API key is missing,
   * the request fails, or the model's answer isn't one of CATEGORIES — the
   * caller then stores the link with no category. Never throws.
   */
  async categorize(input: {
    title: string | null;
    url: string;
    source: LinkSource;
  }): Promise<LinkCategory | null> {
    const apiKey = this.configService.get<string>('DEEPINFRA_API_KEY');
    if (!apiKey) return null;

    // With no title there's almost nothing to go on; skip the call rather
    // than pay for a near-random guess.
    if (!input.title?.trim()) return null;

    const prompt =
      `Classify the following video into exactly one category.\n` +
      `Categories: ${CATEGORIES.join(', ')}.\n` +
      `Reply with only the single category word, nothing else.\n\n` +
      `Platform: ${input.source}\n` +
      `Title: ${input.title}\n` +
      `URL: ${input.url}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(DEEPINFRA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 8,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Categorization request failed',
        );
        return null;
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return null;

      const answer = content
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '');
      return (CATEGORIES as readonly string[]).includes(answer)
        ? (answer as LinkCategory)
        : null;
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Categorization request threw');
      return null;
    }
  }
}
