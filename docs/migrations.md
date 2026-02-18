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
  - for empty databases only (`user` table missing)
  - performs one-time schema bootstrap from current entities
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

## Production rollout

1. Deploy application code.
2. Run `npm run migration:run`.
3. Start/restart app with `DB_MIGRATIONS_RUN=false`.

### Empty database bootstrap

For fresh environments, use the same command:

- `npm run migration:run`

`InitialSchemaBootstrap` will create the base schema if `user` table is absent,
and all following migrations are applied in the same run.

Optional:
- set `DB_MIGRATIONS_RUN=true` for auto-run on bootstrap in controlled environments.
