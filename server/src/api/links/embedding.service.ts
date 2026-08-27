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
      const json = await response.json();
      const embedding = json?.data?.[0]?.embedding;
      return Array.isArray(embedding) ? embedding : null;
    } catch (err) {
      this.logger.warn({ err }, 'Embedding request threw');
      return null;
    }
  }
}

// Builds the document-side text that gets embedded for semantic search.
//
// When a transcript-derived `summary` is available it carries the actual
// content of the video, which is what most searches are really about
// ("that video explaining X"). Title + author_name are still prepended so
// creator/genre queries ("tanmay meme reactions") keep working. `category`
// is only used as a last resort — it's one of ~8 generic buckets and
// concatenating it onto a short string pulls unrelated links together.
export function buildEmbeddingInput(link: {
  title?: string | null;
  authorName?: string | null;
  category?: string | null;
  summary?: string | null;
}): string {
  if (link.summary?.trim()) {
    return [link.title, link.authorName, link.summary.trim()]
      .filter(Boolean)
      .join(' — ');
  }
  return [link.title, link.authorName, link.category]
    .filter(Boolean)
    .join(' — ');
}
