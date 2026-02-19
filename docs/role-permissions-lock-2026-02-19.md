# Role-Permission Lock (Sprint Baseline)

Date: 2026-02-19
Status: active lock for implementation

## Purpose

Freeze a single role and permission baseline for the current sprint to avoid drift between:
- `docs/rbac.md`
- `docs/architecture/roles-permissions-matrix.md`
- `docs/architecture/permission-model.md`
- backend code

This lock is implementation-first and follows backend source of truth.

## Source Of Truth Order

1. `backend/src/users/enums/role.enum.ts`
2. `backend/src/iam/authorization/permission.type.ts`
3. `backend/src/iam/authorization/role-permissions.map.ts`
4. Architecture docs and product docs

If docs conflict with code, this lock and code win for the sprint.

## Locked Roles (Backend)

- `admin`
- `manager`
- `regular`

Product naming mapping:
- `Admin` -> `admin`
- `DepartmentHead` -> `manager`
- `Employee` -> `regular`
- `Analyst` -> `regular` + custom grants

`Chairperson` and `Deputy` remain planned roles and are not active backend roles in this sprint.

## Locked Permission Catalog

IAM/Org:
- `users.read`
- `users.create`
- `users.update`
- `users.delete`
- `departments.read`
- `departments.create`
- `departments.update`
- `departments.delete`

EDM/Documents:
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

Tasks:
- `tasks.read`
- `tasks.create`
- `tasks.update`
- `tasks.delete`
- `tasks.assign`

Analytics/Reports/GIS:
- `analytics.read`
- `analytics.write`
- `reports.read`
- `reports.generate`
- `gis.read`
- `gis.write`

Files:
- `files.read`
- `files.write`
- `files.delete`

## Locked Default Role Baselines

Defaults are taken from `DEFAULT_ROLE_PERMISSIONS` in code:

`admin`:
- all permissions from catalog

`manager`:
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

`regular`:
- `documents.read`
- `documents.route.execute`
- `documents.alerts.read`
- `tasks.read`
- `analytics.read`
- `gis.read`
- `files.read`

## Analyst Profile Lock

For this sprint, analyst is not a separate role enum value.

Analyst profile is:
- role: `regular`
- custom permissions (minimum): `reports.read`, `reports.generate`, `gis.write`
- optional: `analytics.write` by explicit admin grant

## Non-Negotiable Guardrails

- `manager` cannot assign `admin` role.
- `manager` can manage users only within own department scope.
- every endpoint must define permission decorator plus scope/policy checks.
- every allow and deny matrix path must be covered by e2e tests.

## Change Policy During Lock

Any permission or default-role change in code must update:
1. this file
2. `docs/rbac.md`
3. affected endpoint/API contract docs

