import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class CreateFoldersTable1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const foldersExist = await queryRunner.hasTable('folders');
    if (!foldersExist) {
      await queryRunner.createTable(
        new Table({
          name: 'folders',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'user_id', type: 'uuid', isNullable: false },
            { name: 'name', type: 'varchar', length: '50', isNullable: false },
            {
              name: 'icon',
              type: 'varchar',
              length: '32',
              default: "'folder'",
              isNullable: false,
            },
            {
              name: 'color',
              type: 'varchar',
              length: '9',
              default: "'#6B7280'",
              isNullable: false,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'NOW()',
              isNullable: false,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'folders',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_folders_user_id" ON "folders" ("user_id")`,
      );
      // One folder name per user, case-insensitive.
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_folders_user_lower_name" ON "folders" ("user_id", LOWER("name"))`,
      );
    }

    const hasFolderId = await queryRunner.hasColumn('links', 'folder_id');
    if (!hasFolderId) {
      await queryRunner.addColumn(
        'links',
        new TableColumn({
          name: 'folder_id',
          type: 'uuid',
          isNullable: true,
        }),
      );

      await queryRunner.createForeignKey(
        'links',
        new TableForeignKey({
          columnNames: ['folder_id'],
          referencedTableName: 'folders',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.query(
        `CREATE INDEX "IDX_links_folder_id" ON "links" ("folder_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const linksTable = await queryRunner.getTable('links');
    const folderFk = linksTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('folder_id') !== -1,
    );
    if (folderFk) await queryRunner.dropForeignKey('links', folderFk);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_links_folder_id"`);
    if (await queryRunner.hasColumn('links', 'folder_id')) {
      await queryRunner.dropColumn('links', 'folder_id');
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_folders_user_lower_name"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_folders_user_id"`);
    await queryRunner.dropTable('folders', true);
  }
}
