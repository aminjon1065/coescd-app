# Migration Coverage Audit

Date: 2026-02-18
Scope: `backend` TypeORM entities and migrations

## Summary

Current migration strategy is partially explicit and partially bootstrap-driven:
- Explicit incremental migrations exist for:
  - auth hardening
  - files module
  - role permission profile and user change audit log
- Baseline schema for empty DB is created by:
  - `InitialSchemaBootstrap` calling `queryRunner.connection.synchronize(false)`

Risk:
- For non-empty environments, many schema objects are not represented by explicit, replayable migrations.
- This makes schema evolution harder to review and increases drift risk between environments.

## Found Artifacts

Migrations in repo:
- `backend/src/database/migrations/20260218160000-InitialSchemaBootstrap.ts`
- `backend/src/database/migrations/20260218170000-AuthHardeningSchema.ts`
- `backend/src/database/migrations/20260218183000-FilesModuleSchema.ts`
- `backend/src/database/migrations/20260218200000-RoleMatrixAndUserAuditSchema.ts`

Entity groups observed:
- users, departments, tasks, documents
- analytics (categories/types/disasters/reports)
- files
- IAM audit/authorization entities

Note:
- Empty placeholder files exist:
  - `backend/src/analytics/entities/disaster-category.entity.ts`
  - `backend/src/analytics/entities/disaster-type.entity.ts`
  - `backend/src/analytics/entities/disaster.entity.ts`

## Coverage Matrix

Explicit migration coverage:
- covered:
  - `auth_audit_logs`
  - `user.isActive`
  - `files`, `file_links`, `file_access_audit`
  - `role_permission_profiles`
  - `user_change_audit_logs`
- likely bootstrap-only (not explicitly versioned in incremental migrations):
  - `user` base shape (except `isActive`)
  - `departments`
  - `tasks`
  - `documents`
  - analytics tables (`disaster_categories`, `disaster_types`, `disasters`)

## Gaps To Close In Phase 1

1. Replace bootstrap dependency with explicit baseline migrations for core domain tables.
2. Ensure every entity-affecting change after baseline is represented by incremental migration.
3. Add indexes for high-volume query paths:
   - users: email, department, role, isActive
   - tasks: status, creator, receiver, created_at
   - documents: type, status, sender, receiver, department, created_at
   - disasters: status, severity, department, created_at
   - audit tables: actor_id/action/created_at
4. Validate migration run and revert flow in CI on clean DB.

## Recommended Action Plan

1. Freeze entity schema for baseline cut.
2. Generate or handcraft a single auditable baseline migration for uncovered core tables.
3. Keep existing explicit migrations after baseline in chronological order.
4. Add migration CI check:
   - up on empty DB
   - smoke query
   - revert last migration
5. Remove or document use of `synchronize` in migration bootstrap path.

## Exit Criteria

Migration coverage considered complete when:
1. Empty DB provisioning does not rely on implicit synchronization.
2. Existing environment upgrades use only explicit migrations.
3. Roll-forward and rollback are tested and reproducible in CI.

