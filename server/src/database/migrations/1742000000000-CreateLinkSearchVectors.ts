import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-vector search index for links (doc2query approach).
 *
 * Instead of one embedding per link built from its title, each link gets
 * several rows here: one 'canonical' row (title/author/description) plus
 * ~10 'generated_query' rows — short search phrases an LLM predicted a user
 * might type to re-find the link. searchSemantic scores a link by its
 * closest-matching row, which recovers matches a title-only embedding
 * misses.
 *
 * No ANN index: pgvector's ivfflat/hnsw cap at 2000 dimensions, below this
 * column's 4096 (Qwen3-Embedding-8B). Similarity search runs as an exact
 * scan — fine at this table's size.
 */
export class CreateLinkSearchVectors1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "link_search_vectors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "link_id" uuid NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
        "kind" varchar(20) NOT NULL,
        "text" text NOT NULL,
        "embedding" vector(4096) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lsv_link_id" ON "link_search_vectors" ("link_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "link_search_vectors"`);
  }
}
