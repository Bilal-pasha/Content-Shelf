import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveYoutubeLinkedinToSource1737800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move records with category='youtube' to source='youtube' and category=null
    await queryRunner.query(`
      UPDATE links 
      SET source = 'youtube', category = NULL 
      WHERE category = 'youtube'
    `);

    // Move records with category='linkedin' to source='linkedin' and category=null
    await queryRunner.query(`
      UPDATE links 
      SET source = 'linkedin', category = NULL 
      WHERE category = 'linkedin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: Move source='youtube' back to category='youtube'
    await queryRunner.query(`
      UPDATE links 
      SET category = 'youtube', source = 'other' 
      WHERE source = 'youtube'
    `);

    // Revert: Move source='linkedin' back to category='linkedin'
    await queryRunner.query(`
      UPDATE links 
      SET category = 'linkedin', source = 'other' 
      WHERE source = 'linkedin'
    `);
  }
}
