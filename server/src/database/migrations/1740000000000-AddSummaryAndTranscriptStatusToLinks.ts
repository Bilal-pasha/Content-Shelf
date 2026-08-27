import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSummaryAndTranscriptStatusToLinks1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // `summary`: transcript-derived description of the video, embedded for
    // semantic search when present (see LinksService.indexYoutubeLink).
    // `transcript_status`: NULL = not attempted yet, 'ok' = captions found and
    // summarised, 'no_transcript' = video had no captions, 'failed' = the
    // indexing pass threw. Lets a backfill job target the rows worth retrying.
    await queryRunner.query(`ALTER TABLE "links" ADD COLUMN "summary" text`);
    await queryRunner.query(
      `ALTER TABLE "links" ADD COLUMN "transcript_status" varchar(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "links" DROP COLUMN "transcript_status"`,
    );
    await queryRunner.query(`ALTER TABLE "links" DROP COLUMN "summary"`);
  }
}
