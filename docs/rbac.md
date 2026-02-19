# RBAC Matrix

Last updated: 2026-02-19

Canonical sprint baseline: `docs/role-permissions-lock-2026-02-19.md`

## Roles

- `admin`
- `manager`
- `regular`

## Permission Catalog

- `users.read`
- `users.create`
- `users.update`
- `users.delete`
- `departments.read`
- `departments.create`
- `departments.update`
- `departments.delete`
- `documents.read`
- `documents.create`
- `documents.update`
- `documents.delete`
- `documents.route.execute`
- `documents.archive`
- `documents.audit.read`
- `documents.register`
- `documents.alerts.read`
- `documents.alerts.manage`
- `documents.templates.read`
- `documents.templates.write`
- `documents.route.templates.read`
- `documents.route.templates.write`
- `tasks.read`
- `tasks.create`
- `tasks.update`
- `tasks.delete`
- `tasks.assign`
- `analytics.read`
- `analytics.write`
- `reports.read`
- `reports.generate`
- `gis.read`
- `gis.write`
- `files.read`
- `files.write`
- `files.delete`

## Role Matrix

- `admin`: all permissions
- `manager`:
  - `users.read`
  - `departments.read`
  - `documents.read`
  - `documents.create`
  - `documents.update`
  - `documents.route.execute`
  - `documents.archive`
  - `documents.audit.read`
  - `documents.register`
  - `documents.alerts.read`
  - `documents.alerts.manage`
  - `documents.templates.read`
  - `documents.templates.write`
  - `documents.route.templates.read`
  - `documents.route.templates.write`
  - `tasks.read`
  - `tasks.create`
  - `tasks.update`
  - `tasks.assign`
  - `analytics.read`
  - `reports.read`
  - `reports.generate`
  - `gis.read`
  - `files.read`
  - `files.write`
- `regular`:
  - `documents.read`
  - `documents.route.execute`
  - `documents.alerts.read`
  - `tasks.read`
  - `analytics.read`
  - `gis.read`
  - `files.read`

## Effective Permissions Rule

Effective permissions are computed as:

`effective = role_permissions U user.custom_permissions`

This allows keeping a stable role baseline and adding targeted per-user exceptions without creating extra roles.

## Admin API For Custom Permissions

- `PATCH /api/users/:id/permissions`
- Access: `admin` + `users.update`
- Body:
  - `permissions: Permission[]`

Additional user lifecycle API:
- `PATCH /api/users/:id/active`
- Access: `admin` + `users.update`
- Body:
  - `isActive: boolean`

## Seeded Users

Run CLI seeding with:

`npm run seed:iam`

Seeding can be disabled with `IAM_SEED_ENABLED=false`.

Default users:
- `admin@coescd.local` (`admin123`) role `admin`
- `manager@coescd.local` (`manager123`) role `manager`
- `operator@coescd.local` (`operator123`) role `regular`

## ABAC Scope Rules (Initial)

- Admin: full access.
- Manager:
  - Users: only users in same department.
  - Documents: own documents or department documents.
  - Tasks: own tasks or tasks where creator/receiver is in same department.
- Regular:
  - Users: only self.
  - Documents: only where sender/receiver is self.
  - Tasks: only where creator/receiver is self.
  - Files: own files only.

Files scope additions:
- Admin:
  - Files: full access.
- Manager:
  - Files: own files and files in own department.

## Auth Hardening

- CSRF double-submit protection:
  - Server sets `csrfToken` cookie.
  - Client sends `x-csrf-token` header for:
    - `POST /api/authentication/refresh-tokens`
    - `POST /api/authentication/logout`
- Sign-in lockout:
  - Failed attempts are tracked per `email + ip`.
  - Lockout and attempt windows are configured via env vars.
- Refresh endpoint rate limit:
  - Attempts tracked per `ip`.
- Auth audit log:
  - Stored in `auth_audit_logs` table.
  - Records `sign-in`, `refresh`, `logout` with success/failure metadata.

Session lifecycle endpoints:
- `POST /api/authentication/change-password`
  - Requires bearer token.
  - Revokes refresh sessions for the user.
- `POST /api/authentication/logout-all-devices`
  - Requires bearer token.
  - Revokes all refresh sessions for the user.

## Files Endpoints Access

- `POST /api/files/upload`
  - permission: `files.write`
- `POST /api/files/upload-url`
  - permission: `files.write`
- `POST /api/files/upload-complete`
  - permission: `files.write`
- `GET /api/files`
  - permission: `files.read`
  - ABAC scoped list
- `GET /api/files/:id`
  - permission: `files.read`
  - ABAC scoped object access
- `GET /api/files/:id/download`
  - permission: `files.read`
  - ABAC scoped object access
- `GET /api/files/:id/download-url`
  - permission: `files.read`
  - ABAC scoped object access
- `DELETE /api/files/:id`
  - permission: `files.delete`

Document/task integrations:
- `GET /api/documents/:id/files`
  - permissions: `documents.read` + `files.read`
- `POST /api/documents/:id/files/:fileId`
  - permissions: `documents.update` + `files.write`
- `DELETE /api/documents/:id/files/:fileId`
  - permissions: `documents.update` + `files.write`
- `GET /api/task/:id/files`
  - permissions: `tasks.read` + `files.read`
- `POST /api/task/:id/files/:fileId`
  - permissions: `tasks.update` + `files.write`
- `DELETE /api/task/:id/files/:fileId`
  - permissions: `tasks.update` + `files.write`

## E2E Coverage (Current)

- `RBAC + ABAC (e2e)` covers:
  - users/documents/tasks RBAC + ABAC matrix (`admin/manager/regular`)
  - files permission checks (`files.read/files.write/files.delete` paths)
  - files ABAC cross-department restrictions
  - document/files link-list-unlink matrix
  - task/files link-list-unlink matrix
  - presigned flow (`upload-url -> upload-complete -> download-url`)
  - upload limits and MIME whitelist validation
  - file access audit creation for upload/download/delete
