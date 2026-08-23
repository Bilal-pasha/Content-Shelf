import { MigrationInterface } from 'typeorm';

/**
 * This migration previously seeded a super-admin account with a plaintext
 * password committed to source control. That is a credential leak: the
 * password lived in git history and ran in every environment migrations
 * were applied to, including production.
 *
 * The seeding logic has been removed. Provision admin accounts out-of-band
 * (a one-off script reading credentials from environment variables, run
 * outside version control) instead of via a committed migration.
 *
 * If this migration already ran against an existing database, that account
 * (bilalpasha.dev@gmail.com) still exists there with the leaked password —
 * rotate or delete it manually.
 */
export class CreateSuperAdmin1735296000000 implements MigrationInterface {
  public async up(): Promise<void> {
    // Intentional no-op — see class comment above.
  }

  public async down(): Promise<void> {
    // Intentional no-op — nothing to revert.
  }
}
