import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResizeLinksEmbeddingForQwen1739000300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Switching embedding providers (OpenAI text-embedding-3-small, 1536
    // dims -> DeepInfra Qwen/Qwen3-Embedding-8B, 4096 dims). Existing vectors
    // are the wrong dimensionality and incomparable with new ones, so they
    // must be cleared — affected links fall back to plain-text search until
    // LinksService.backfillMissingEmbeddings() is run for them.
    await queryRunner.query(`DROP INDEX "IDX_links_embedding"`);
    await queryRunner.query(`UPDATE "links" SET "embedding" = NULL`);
    await queryRunner.query(
      `ALTER TABLE "links" ALTER COLUMN "embedding" TYPE vector(4096)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_links_embedding" ON "links" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_links_embedding"`);
    await queryRunner.query(`UPDATE "links" SET "embedding" = NULL`);
    await queryRunner.query(
      `ALTER TABLE "links" ALTER COLUMN "embedding" TYPE vector(1536)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_links_embedding" ON "links" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
    );
  }
}
