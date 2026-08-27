import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Undoes the reverted "transcript -> summary -> embedding" feature
 * (AddSummaryAndTranscriptStatusToLinks1740000000000, whose file was
 * removed with the code revert). That earlier migration had already run on
 * prod, so the columns still exist there and must be dropped explicitly —
 * a deleted migration file is not a down-migration.
 *
 * IF EXISTS / IF NOT EXISTS so this is a no-op on databases where the
 * reverted migration never ran.
 */
export class DropSummaryAndTranscriptStatusFromLinks1741000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "links" DROP COLUMN IF EXISTS "transcript_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "links" DROP COLUMN IF EXISTS "summary"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "summary" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "links" ADD COLUMN IF NOT EXISTS "transcript_status" varchar(20)`,
    );
  }
}
