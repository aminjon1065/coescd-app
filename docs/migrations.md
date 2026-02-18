# Database Migrations

## Why

- `synchronize` is disabled in runtime config.
- Schema changes must be applied through TypeORM migrations.

## Commands

Run from `backend`:

- `npm run migration:run`
- `npm run migration:revert`
- `npm run migration:create`
- `npm run migration:generate`

## Current baseline migration

- `src/database/migrations/20260218170000-AuthHardeningSchema.ts`
  - adds `user.isActive`
  - creates `auth_audit_logs`

## Production rollout

1. Deploy application code.
2. Run `npm run migration:run`.
3. Start/restart app with `DB_MIGRATIONS_RUN=false`.

Optional:
- set `DB_MIGRATIONS_RUN=true` for auto-run on bootstrap in controlled environments.
