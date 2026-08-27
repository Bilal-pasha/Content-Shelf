import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const EMBEDDING_MODEL = 'Qwen/Qwen3-Embedding-8B';
const DEEPINFRA_EMBEDDINGS_URL =
  'https://api.deepinfra.com/v1/openai/embeddings';

// Qwen3-Embedding is trained asymmetrically: query-side text is expected to
// carry a task instruction, document-side text is embedded plain. Applying
// this only on the query side (see `embed(text, { isQuery: true })`) aligns
// retrieval with how the model was actually trained rather than treating
// both sides identically.
const QUERY_INSTRUCTION =
  'Instruct: Given a search query, retrieve saved videos relevant to the query\nQuery: ';

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(EmbeddingService.name)
    private readonly logger: PinoLogger,
  ) {}

  async embed(
    text: string,
    options?: { isQuery?: boolean },
  ): Promise<number[] | null> {
    const apiKey = this.configService.get<string>('DEEPINFRA_API_KEY');
    if (!apiKey) return null;

    const input = options?.isQuery ? `${QUERY_INSTRUCTION}${text}` : text;

    try {
      const response = await fetch(DEEPINFRA_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
      });
      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Embedding request failed',
        );
        return null;
      }
      const json = (await response.json()) as {
        data?: { embedding?: unknown }[];
      };
      const embedding = json?.data?.[0]?.embedding;
      return Array.isArray(embedding) ? (embedding as number[]) : null;
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Embedding request threw');
      return null;
    }
  }

  /**
   * Embed many document-side texts in one request. Returns an array aligned
   * with `texts`; individual entries are null if the response was missing or
   * malformed for that index, and the whole result is null when the request
   * fails (mirrors `embed`). Always document-side — no query instruction.
   */
  async embedBatch(texts: string[]): Promise<(number[] | null)[] | null> {
    const apiKey = this.configService.get<string>('DEEPINFRA_API_KEY');
    if (!apiKey) return null;
    if (texts.length === 0) return [];

    try {
      const response = await fetch(DEEPINFRA_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
      });
      if (!response.ok) {
        this.logger.warn(
          { status: response.status },
          'Batch embedding request failed',
        );
        return null;
      }
      const json = (await response.json()) as {
        data?: { embedding?: unknown; index?: number }[];
      };
      const rows = json?.data;
      if (!Array.isArray(rows)) return null;

      // DeepInfra echoes `index`; don't assume response order matches input.
      const out: (number[] | null)[] = Array.from(
        { length: texts.length },
        () => null,
      );
      rows.forEach((row, i) => {
        const idx = typeof row?.index === 'number' ? row.index : i;
        if (idx >= 0 && idx < out.length && Array.isArray(row.embedding)) {
          out[idx] = row.embedding as number[];
        }
      });
      return out;
    } catch (err: unknown) {
      this.logger.warn({ err }, 'Batch embedding request threw');
      return null;
    }
  }
}

// The 'canonical' document text for a link: the plain metadata we resolved,
// embedded as one row in link_search_vectors alongside the LLM-generated
// query phrases so a direct title/author/description match never regresses.
export function buildEmbeddingInput(link: {
  title?: string | null;
  authorName?: string | null;
  description?: string | null;
  category?: string | null;
}): string {
  return [link.title, link.authorName, link.description, link.category]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(' — ');
}
