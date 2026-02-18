# Files API

Last updated: 2026-02-18

Base URL: `/api/files`

## Auth And Access

- All endpoints require `Authorization: Bearer <accessToken>`.
- RBAC permissions:
  - `files.read`
  - `files.write`
  - `files.delete`
- ABAC scope:
  - `admin`: all files
  - `manager`: own files + same-department files
  - `regular`: own files

## Environment Controls

- `FILES_PRESIGNED_ENABLED` (`true|false`)
- `FILES_PRESIGNED_UPLOAD_TTL_SECONDS`
- `FILES_PRESIGNED_DOWNLOAD_TTL_SECONDS`
- `FILES_UPLOAD_MAX_BYTES`
- `FILES_ALLOWED_MIME_TYPES` (comma-separated list)

## Endpoints

### 1. Upload (multipart)

- `POST /api/files/upload`
- Permission: `files.write`
- Content type: `multipart/form-data`
- Form field: `file`

Example:

```bash
curl -X POST http://localhost:8008/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@./example.pdf;type=application/pdf"
```

Success `201`:

```json
{
  "id": 42,
  "originalName": "example.pdf",
  "storageKey": "local/1/2026/02/uuid-example.pdf",
  "bucket": "coescd-files",
  "mimeType": "application/pdf",
  "sizeBytes": "12345",
  "checksumSha256": "<sha256>",
  "status": "active"
}
```

Common errors:
- `400`: file is missing, empty, too large, or MIME is not allowed
- `403`: missing `files.write`

### 2. Create presigned upload URL

- `POST /api/files/upload-url`
- Permission: `files.write`

Body:

```json
{
  "originalName": "example.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 12345
}
```

Success `201`:

```json
{
  "uploadUrl": "https://...",
  "key": "local/1/2026/02/uuid-example.pdf",
  "bucket": "coescd-files",
  "expiresInSeconds": 600,
  "requiredHeaders": {
    "Content-Type": "application/pdf"
  }
}
```

Common errors:
- `400`: presigned mode disabled, bad MIME, or size exceeds limit
- `403`: missing `files.write`

### 3. Complete presigned upload

- `POST /api/files/upload-complete`
- Permission: `files.write`

Body:

```json
{
  "key": "local/1/2026/02/uuid-example.pdf",
  "originalName": "example.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 12345,
  "checksumSha256": "<64-hex>"
}
```

Success `201`: file metadata object (same shape as upload response).

Common errors:
- `400`: object not found by key, size/mime mismatch, metadata already exists
- `403`: missing `files.write`

### 4. List files

- `GET /api/files`
- Permission: `files.read`
- Result is ABAC-scoped.

Success `200`:

```json
[
  {
    "id": 42,
    "originalName": "example.pdf",
    "status": "active"
  }
]
```

### 5. Get file metadata

- `GET /api/files/:id`
- Permission: `files.read`

Common errors:
- `403`: outside ABAC scope
- `404`: file not found

### 6. Download file stream

- `GET /api/files/:id/download`
- Permission: `files.read`
- Response headers include:
  - `Content-Type`
  - `Content-Disposition: attachment; filename="<originalName>"`

Common errors:
- `403`: outside ABAC scope
- `404`: file not found/deleted

### 7. Create presigned download URL

- `GET /api/files/:id/download-url`
- Permission: `files.read`

Success `200`:

```json
{
  "fileId": 42,
  "downloadUrl": "https://...",
  "expiresInSeconds": 300
}
```

Common errors:
- `400`: presigned mode disabled
- `403`: outside ABAC scope
- `404`: file not found/deleted

### 8. Soft delete file

- `DELETE /api/files/:id`
- Permission: `files.delete`

Success `200`: file metadata with `status = "deleted"` and `deletedAt`.

Common errors:
- `403`: missing `files.delete` or outside ABAC scope
- `404`: file not found

### 9. Link file to domain resource

- `POST /api/files/:id/link`
- Permission: `files.write`

Body:

```json
{
  "resourceType": "document",
  "resourceId": 1001
}
```

Success `201`:

```json
{
  "id": 7,
  "file": { "id": 42 },
  "resourceType": "document",
  "resourceId": 1001
}
```

## Domain Attachment Endpoints

These endpoints provide attachment workflows directly from domain modules.

### Documents

- `GET /api/documents/:id/files`
  - permissions: `documents.read` + `files.read`
- `POST /api/documents/:id/files/:fileId`
  - permissions: `documents.update` + `files.write`
- `DELETE /api/documents/:id/files/:fileId`
  - permissions: `documents.update` + `files.write`

### Tasks

- `GET /api/task/:id/files`
  - permissions: `tasks.read` + `files.read`
- `POST /api/task/:id/files/:fileId`
  - permissions: `tasks.update` + `files.write`
- `DELETE /api/task/:id/files/:fileId`
  - permissions: `tasks.update` + `files.write`

ABAC note:
- caller must have scope access to both resources (file and document/task)
- cross-department link attempts are forbidden for manager/regular

## Audit Behavior

`file_access_audit` stores file security-sensitive operations.

Current audited actions:
- `upload`
- `download`
- `delete`
- `link`
- `presign_download`

Stored metadata:
- `file_id`
- `actor_id`
- `action`
- `success`
- `ip`
- `user_agent`
- `reason`
- `created_at`
