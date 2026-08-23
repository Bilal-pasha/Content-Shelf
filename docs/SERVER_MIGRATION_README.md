# Database Migrations

## Running Migrations

### Development
```bash
cd server
npm run migration:run
```

### Production (in Docker)
```bash
docker-compose -f infra/prod/docker-compose.yml exec backend npm run migration:run
```

## Available Migrations

1. **AddRoleColumn** - Adds `role` column to users table
2. **CreateSuperAdmin** - No-op (see note below)

## Migration Scripts

- `npm run migration:run` - Run all pending migrations
- `npm run migration:revert` - Revert the last migration
- `npm run migration:generate` - Generate a new migration from entity changes
- `npm run migration:create` - Create an empty migration file

## Notes

- Migrations are automatically run in development if `synchronize: true` is enabled
- In production, always run migrations manually before starting the application
- `CreateSuperAdmin` originally seeded an admin account with a plaintext password
  committed to source control. That was a credential leak and has been removed —
  the migration is now a no-op kept only so migration history stays intact.
  Provision admin accounts via a one-off script that reads credentials from
  environment variables, never via a committed migration. **If this migration
  already ran against a real database, rotate or delete that account manually —
  its password is exposed in git history.**


