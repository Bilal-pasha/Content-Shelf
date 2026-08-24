import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

@Injectable()
export class EmbeddingService {
  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(EmbeddingService.name)
    private readonly logger: PinoLogger,
  ) {}

  async embed(text: string): Promise<number[] | null> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) return null;

    try {
      const response = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
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

// Only ever called with YouTube data (title + author_name from oEmbed +
// category) in this v1 prototype — author_name is more discriminative for
// semantic search than the literal string "youtube" would be. When a
// second platform is added, generalize this to accept whatever
// per-platform fields are available.
export function buildEmbeddingInput(link: {
  title?: string | null;
  authorName?: string | null;
  category?: string | null;
}): string {
  return [link.title, link.authorName, link.category]
    .filter(Boolean)
    .join(' — ');
}
