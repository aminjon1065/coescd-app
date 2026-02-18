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
