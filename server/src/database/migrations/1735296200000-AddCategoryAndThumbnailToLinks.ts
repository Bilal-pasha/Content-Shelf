import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryAndThumbnailToLinks1735296200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCategory = await queryRunner.hasColumn('links', 'category');
    if (!hasCategory) {
      await queryRunner.addColumn(
        'links',
        new TableColumn({
          name: 'category',
          type: 'varchar',
          length: '50',
          isNullable: true,
        }),
      );
    }

    const hasThumbnail = await queryRunner.hasColumn('links', 'thumbnail_url');
    if (!hasThumbnail) {
      await queryRunner.addColumn(
        'links',
        new TableColumn({
          name: 'thumbnail_url',
          type: 'varchar',
          length: '2048',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('links', 'thumbnail_url');
    await queryRunner.dropColumn('links', 'category');
  }
}
