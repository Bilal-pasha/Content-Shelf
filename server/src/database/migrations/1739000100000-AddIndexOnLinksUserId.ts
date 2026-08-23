import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexOnLinksUserId1739000100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres does not auto-index foreign key columns; every links list
    // query filters on user_id, so this was a full table scan.
    await queryRunner.query(
      `CREATE INDEX "IDX_links_user_id" ON "links" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_links_user_id"`);
  }
}
