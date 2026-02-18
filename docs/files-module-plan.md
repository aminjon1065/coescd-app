# Files Module Plan And Architecture

Last updated: 2026-02-18

## Goal

Сделать модуль `files`, который обеспечивает:
- безопасную загрузку/скачивание файлов,
- хранение бинарных данных в MinIO/S3,
- хранение метаданных и прав доступа в PostgreSQL,
- интеграцию с `documents` и будущими доменами,
- RBAC + ABAC + audit,
- наблюдаемость и управляемые lifecycle-операции.

## Deployment Assumption

- Single-server deployment: application, PostgreSQL and MinIO/S3-compatible storage are hosted on the same server.
- Files API uses private/internal network paths for object storage access.
- Public CDN/external object delivery is out of scope for MVP.

## Scope (MVP)

Входит в MVP:
- Upload file (single)
- Download file
- List files (с фильтрами)
- Soft delete / restore
- Привязка файла к документу
- Scoped access (owner / department / admin)
- Antivirus hook (async stub, без реального сканера в первом шаге)

Не входит в MVP:
- Полное версионирование контента
- Full-text индекс содержимого
- CDN optimization
- Data Loss Prevention rules

## Domain Model

### Entity: `files`

- `id` (PK)
- `original_name`
- `storage_key` (unique)
- `bucket`
- `mime_type`
- `size_bytes`
- `checksum_sha256`
- `owner_id` (FK users.id)
- `department_id` (FK departments.id, nullable)
- `status` (`active|quarantined|deleted`)
- `deleted_at` (nullable)
- `created_at`
- `updated_at`

### Entity: `file_links`

Универсальная привязка файла к доменным сущностям.

- `id` (PK)
- `file_id` (FK files.id)
- `resource_type` (`document|task|message|report`)
- `resource_id` (int)
- `created_by` (FK users.id)
- `created_at`

### Entity: `file_access_audit`

- `id` (PK)
- `file_id` (FK files.id)
- `actor_id` (FK users.id)
- `action` (`upload|download|delete|restore|link|unlink`)
- `ip`
- `user_agent`
- `success`
- `reason` (nullable)
- `created_at`

## Access Control

## RBAC

- `files.read`
- `files.write`
- `files.delete`

## ABAC rules (MVP)

- `admin`: full access
- `manager`: доступ к файлам своего департамента + своим
- `regular`: только свои файлы и файлы, к которым привязан как участник ресурса

## API Design (MVP)

Base: `/api/files`

1. `POST /upload`
- multipart upload
- permission: `files.write`
- result: file metadata

2. `GET /:id`
- permission: `files.read`
- returns metadata

3. `GET /:id/download`
- permission: `files.read`
- streams file (or signed URL in future)

4. `GET /`
- permission: `files.read`
- filters: `ownerId`, `departmentId`, `resourceType`, `resourceId`, `status`
- always scope-filtered by ABAC

5. `DELETE /:id`
- permission: `files.delete`
- soft delete metadata + object retention policy decision

6. `POST /:id/restore`
- permission: `files.delete`
- restore soft-deleted file

7. `POST /:id/link`
- permission: `files.write`
- body: `{ resourceType, resourceId }`

8. `POST /:id/unlink`
- permission: `files.write`

## Storage Strategy

- Binary: MinIO/S3 (`bucket=coescd-files`)
- Key pattern:
  - `env/{departmentId}/{yyyy}/{mm}/{uuid}-{sanitizedName}`
- Metadata: Postgres
- Transaction model:
  - upload object -> save metadata -> audit
  - on metadata failure: best-effort object cleanup

## Security

- Content-type validation + max size limits
- Filename sanitization
- Optional presigned upload/download for external clients
- Antivirus workflow (future async queue)
- No direct public object URLs in MVP

## Observability

- Structured logs for file ops
- Metrics:
  - upload count/size
  - download count
  - failed access count
  - latency buckets for upload/download
- Audit records in `file_access_audit`

## Integration Points

- `documents`: add `file_links(resource_type='document')`
- future: `tasks`, `chat`, `analytics reports`
- `iam`: reuse existing RBAC+ABAC framework and scope service

## Rollout Plan

### Phase 1: Schema + Core Service

- add migrations: `files`, `file_links`, `file_access_audit`
- create `files` module skeleton (entity/service/controller)
- local storage adapter abstraction

### Phase 2: MinIO Adapter + API MVP

- implement S3-compatible adapter
- implement endpoints upload/get/list/download/delete
- enforce RBAC + ABAC and audit logging

### Phase 3: Document Integration

- link/unlink endpoints
- update document workflows to use `file_links`
- e2e tests: docs + files access matrix

### Phase 4: Hardening

- quotas per user/department
- upload rate-limit
- async scan hook + quarantine status
- retention policy and cleanup jobs

## Test Plan

### Unit

- storage adapter contract
- checksum generation
- scope checks and permissions

### E2E

- upload/download success paths
- forbidden cross-department access
- soft delete and restore
- link/unlink with documents
- audit entries created for sensitive actions

## Definition Of Done (MVP)

- migrations applied without `synchronize`
- all files endpoints protected by RBAC+ABAC
- MinIO working in local compose
- e2e green for files matrix
- docs updated (`README.md`, `docs/rbac.md`, `docs/migrations.md`)
