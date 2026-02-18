# RBAC Matrix

Last updated: 2026-02-18

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
