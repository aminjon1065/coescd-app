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

- `src/database/migrations/20260218160000-InitialSchemaBootstrap.ts`
  - legacy compatibility migration
  - no-op (implicit synchronize bootstrap is deprecated)
- `src/database/migrations/20260218165000-CoreDomainExplicitBaseline.ts`
  - adds explicit baseline coverage for core domain tables when missing:
    - `user`, `departments`, `tasks`, `documents`
    - `disaster_categories`, `disaster_types`, `disasters`
  - idempotent and safe on environments where these tables already exist
- `src/database/migrations/20260218170000-AuthHardeningSchema.ts`
  - adds `user.isActive`
  - creates `auth_audit_logs`
- `src/database/migrations/20260218183000-FilesModuleSchema.ts`
  - creates `files`
  - creates `file_links`
  - creates `file_access_audit`
- `src/database/migrations/20260218200000-RoleMatrixAndUserAuditSchema.ts`
  - creates `role_permission_profiles`
  - creates `user_change_audit_logs`
- `src/database/migrations/20260218203000-ListPerformanceIndexes.ts`
  - adds list/query performance indexes for:
    - `user`, `tasks`, `documents`, `disasters`
    - `auth_audit_logs`, `user_change_audit_logs`, `file_access_audit`

## Production rollout

1. Deploy application code.
2. Run `npm run migration:run`.
3. Start/restart app with `DB_MIGRATIONS_RUN=false`.

### Empty database bootstrap

For fresh environments, use the same command:

- `npm run migration:run`

`CoreDomainExplicitBaseline` will create uncovered core domain tables when missing,
and all following incremental migrations are applied in the same run.

Bootstrap policy:
- production/staging: explicit migrations only, no schema synchronize path
- local development: use migrations for schema parity with production

Optional:
- set `DB_MIGRATIONS_RUN=true` for auto-run on bootstrap in controlled environments.
