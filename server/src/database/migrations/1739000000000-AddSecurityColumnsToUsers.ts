import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSecurityColumnsToUsers1739000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash of the single currently-valid refresh token, so logout and
    // password changes can actually revoke a session instead of just
    // clearing cookies (a copied token would otherwise stay valid until expiry).
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'current_refresh_token_hash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Password-reset token support (forgot/reset password flow).
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token_hash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password_reset_token_expires_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password_reset_token_expires_at');
    await queryRunner.dropColumn('users', 'password_reset_token_hash');
    await queryRunner.dropColumn('users', 'current_refresh_token_hash');
  }
}
