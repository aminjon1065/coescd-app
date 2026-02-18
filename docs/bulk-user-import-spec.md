# Bulk User Import Spec (CORE-008)

Last updated: 2026-02-18
Status: approved design spec for Phase 2 implementation

## Goal

Enable one admin to onboard and maintain 200+ users safely via CSV:
- validate first (`dry-run`)
- apply explicitly (`apply`)
- support idempotent re-runs
- provide full audit trail

## Scope

In scope:
- CSV ingestion API for user lifecycle bulk operations
- validation/error report contract
- idempotent upsert behavior
- role/department mapping rules
- audit requirements

Out of scope:
- UI implementation details (separate task)
- SSO / external IAM sync
- async job queue worker implementation details

## Access Control

- Endpoint group: `/api/users/bulk-import/*`
- Role required: `admin`
- Permission required: `users.create` and `users.update`
- All operations must be audited (`user_change_audit_logs` + bulk operation audit event)

## Import Modes

Supported mode:
- `upsert`
  - if email exists: update mutable fields
  - if email not found: create user

Future mode (optional):
- `create_only`
- `update_only`

## CSV Format

Required columns:
1. `email`
2. `name`
3. `role`

Optional columns:
1. `department_id`
2. `department_name`
3. `position`
4. `is_active`
5. `permissions`
6. `password`

Rules:
- `department_id` has priority over `department_name` if both provided
- `role` allowed values: `admin`, `manager`, `regular`
- `is_active` allowed values: `true`, `false` (default: `true`)
- `permissions` is comma-separated permission list
- `password` required only for newly created users if policy requires manual password import

## Validation Rules

Row-level validation:
- valid email format
- role in enum
- department exists (by `department_id` or exact `department_name`)
- permissions belong to supported permission enum
- manager/admin role rules can enforce non-null department if policy enabled

File-level validation:
- max rows configurable (`BULK_IMPORT_MAX_ROWS`, default 5000)
- max file size configurable (`BULK_IMPORT_MAX_BYTES`)
- duplicate emails in same file flagged as error

Policy checks:
- cannot downgrade last active admin account
- cannot deactivate actor account in same import batch

## API Contract

## 1) Dry-run

`POST /api/users/bulk-import/dry-run`

Request:
- multipart form-data:
  - `file` (CSV)
  - `mode` (`upsert`)
  - `allowRoleUpdate` (`true|false`, default `true`)
  - `allowPermissionUpdate` (`true|false`, default `true`)

Response `200`:
- `sessionId`: preview session id (TTL-backed)
- `summary`:
  - `totalRows`
  - `validRows`
  - `invalidRows`
  - `toCreate`
  - `toUpdate`
  - `unchanged`
- `errors`: list of row errors:
  - `rowNumber`
  - `field`
  - `code`
  - `message`
- `warnings`: non-blocking issues

## 2) Apply

`POST /api/users/bulk-import/apply`

Request JSON:
- `sessionId`: string
- `idempotencyKey`: string
- `confirm`: boolean (must be `true`)

Behavior:
- apply only rows marked valid in preview
- if `invalidRows > 0`, behavior configurable:
  - strict mode: reject apply
  - partial mode: apply valid rows only

Response `200`:
- `operationId`
- `summary`:
  - `created`
  - `updated`
  - `skipped`
  - `failed`
- `failures`: row-level apply errors

## 3) Status (optional if async)

`GET /api/users/bulk-import/operations/:operationId`

Response:
- `status`: `queued|running|completed|failed|partial`
- `progress`: counts
- `startedAt`, `finishedAt`
- `summary`, `failures`

## Idempotency

- `idempotencyKey` unique per actor + apply call
- repeated apply with same key returns same operation result
- preview `sessionId` has TTL (recommended: 30 min)

## Update Semantics

Mutable by upsert:
- `name`
- `position`
- `department`
- `role` (if `allowRoleUpdate=true`)
- `permissions` (if `allowPermissionUpdate=true`)
- `isActive`

Not mutable by this import:
- user `id`
- audit history

Password strategy:
- for existing users: do not overwrite password by default
- for new users: either required in CSV or auto-generated + forced reset flow

## Auditing

For each apply operation:
- write operation-level audit record:
  - actor id, file hash, mode, summary, started/finished timestamps
- write per-user change log entries via existing `user_change_audit_logs`

## Error Codes

Recommended error codes:
- `invalid_email`
- `invalid_role`
- `invalid_permission`
- `department_not_found`
- `duplicate_email_in_file`
- `forbidden_role_change`
- `password_missing_for_new_user`
- `conflict_last_admin`

## Operational Limits

Recommended defaults:
- max rows: `5000`
- max file size: `5MB`
- preview TTL: `30m`
- apply timeout: `120s` sync path

## Implementation Notes

Recommended internals:
1. CSV parse service + normalized row model
2. validation pipeline returning `rowResult[]`
3. preview session storage (redis/in-memory fallback)
4. apply executor with transaction batching (e.g. chunks of 100)
5. operation summary persistence

## Acceptance Criteria

1. Admin can import 200+ users in one file with dry-run preview.
2. Re-running same file with same `idempotencyKey` is safe.
3. Validation report is actionable (row + field + code + message).
4. All applied changes are auditable per user and per operation.

