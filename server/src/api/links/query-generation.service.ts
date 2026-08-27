import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { LinkSource } from './link.entity';

const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
const DEEPINFRA_CHAT_URL =
  'https://api.deepinfra.com/v1/openai/chat/completions';

const MAX_QUERIES = 10;
const MIN_WORDS = 2;
const MAX_QUERY_LEN = 120;

export interface LinkMetaForQueries {
  source: LinkSource;
  title: string | null;
  authorName: string | null;
  authorUrl: string | null;
  description: string | null;
  category: string | null;
  url: string;
}

@Injectable()
export class QueryGenerationService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(QueryGenerationService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * doc2query: ask an LLM for the search phrases a user might later type to
   * re-find this saved video, so each phrase can be embedded and indexed.
   * Best-effort — returns [] when the API key is missing, there's too little
   * metadata to work with, or the request/parse fails. Never throws.
   */
  async generate(meta: LinkMetaForQueries): Promise<string[]> {
    const apiKey = this.configService.get<string>('DEEPINFRA_API_KEY');
    if (!apiKey) return [];

    // Nothing descriptive to go on -> the model can only echo generic
    // filler; skip the call.
    if (!meta.title?.trim() && !meta.description?.trim()) return [];

    const prompt =
      `A user saved this video to a personal library and will later search ` +
      `to re-find it. Generate up to ${MAX_QUERIES} short search queries they ` +
      `might type.\n\n` +
      `Rules:\n` +
      `- Use ONLY facts given below. Never invent titles, names, or events.\n` +
      `- Vary the angle: some naming the creator, some describing the topic ` +
      `or genre, some as natural questions, some as keyword fragments.\n` +
      `- No duplicates or near-duplicates. No hashtags. Lowercase.\n` +
      `- Output ONLY a JSON array of strings, nothing else.\n\n` +
      `source: ${meta.source}\n` +
      `title: ${meta.title ?? ''}\n` +
      `channel: ${meta.authorName ?? ''} ${meta.authorUrl ?? ''}\n` +
      `description: ${meta.description ?? ''}\n` +
      `category: ${meta.category ?? ''}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(DEEPINFRA_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 400,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Query generation request failed',
        );
        return [];
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return [];

      return this.parseQueries(content);
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Query generation request threw');
      return [];
    }
  }

  private parseQueries(content: string): string[] {
    // Be lenient: the model sometimes wraps the array in prose or a code
    // fence. Grab the first [...] block and parse that.
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];

    let raw: unknown;
    try {
      raw = JSON.parse(match[0]);
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];

    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item !== 'string') continue;
      const q = item.trim().toLowerCase().replace(/\s+/g, ' ');
      if (
        q.length === 0 ||
        q.length > MAX_QUERY_LEN ||
        q.split(' ').length < MIN_WORDS ||
        seen.has(q)
      ) {
        continue;
      }
      seen.add(q);
      out.push(q);
      if (out.length >= MAX_QUERIES) break;
    }
    return out;
  }
}
