import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingToLinks1739000200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    // Nullable: existing rows have no embedding yet, and embedding
    // generation is best-effort — link creation must not depend on it.
    await queryRunner.query(
      `ALTER TABLE "links" ADD COLUMN "embedding" vector(1536)`,
    );
    // lists = 100 is a reasonable default for a new/small table; revisit
    // once there's real data volume (rule of thumb: rows / 1000).
    await queryRunner.query(
      `CREATE INDEX "IDX_links_embedding" ON "links" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_links_embedding"`);
    await queryRunner.query(`ALTER TABLE "links" DROP COLUMN "embedding"`);
    // Extension left installed — dropping it could affect other tables.
  }
}
