# EDM API Contract v1

Last updated: 2026-02-18
Status: draft for backend implementation
Base URL: `/api/edm`

## Purpose

Define implementation-ready API contract for EDM v1 aligned with:
- `docs/architecture/edm-functional-spec-v1.md`
- `docs/architecture/edm-schema-v1.md`

Scope:
- document lifecycle commands
- route stage actions
- work queues and search queries
- audit timeline and attachments

Out of scope:
- UI contracts (frontend state models)
- external system integration APIs

## Auth And Access

- All endpoints require `Authorization: Bearer <accessToken>`.
- RBAC permissions (minimum set):
  - `documents.create`
  - `documents.read`
  - `documents.update`
  - `documents.route.execute`
  - `documents.archive`
  - `documents.audit.read`
- ABAC scope:
  - `admin/chairperson`: global
  - `department_head/deputy`: own department (plus active delegation)
  - `regular`: own drafts + assigned stages + explicitly shared docs
- Confidentiality check is mandatory after RBAC/ABAC check:
  - `public_internal`
  - `department_confidential`
  - `restricted`

## Common DTO Fragments

Document summary:

```json
{
  "id": 1011,
  "externalNumber": "FIN-ORDER-2026-000123",
  "type": "order",
  "status": "in_route",
  "title": "Quarterly procurement order",
  "departmentId": 7,
  "creatorId": 15,
  "confidentiality": "department_confidential",
  "createdAt": "2026-02-18T09:15:00.000Z",
  "updatedAt": "2026-02-18T10:00:00.000Z"
}
```

Stage action result:

```json
{
  "documentId": 1011,
  "routeId": 301,
  "stageId": 9001,
  "action": "approved",
  "stageState": "approved",
  "routeState": "active",
  "documentStatus": "in_route",
  "actedAt": "2026-02-18T10:05:00.000Z"
}
```

Error envelope:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "code": "EDM_SCOPE_FORBIDDEN",
  "message": "Document is outside your scope",
  "timestamp": "2026-02-18T10:06:00.000Z",
  "path": "/api/edm/documents/1011"
}
```

## Commands

### 1) Create draft

- `POST /api/edm/documents`
- Permission: `documents.create`

Body:

```json
{
  "type": "internal",
  "title": "Incident follow-up",
  "subject": "Water pipeline issue",
  "summary": "Need field verification",
  "resolutionText": null,
  "departmentId": 7,
  "confidentiality": "department_confidential",
  "dueAt": "2026-02-25T18:00:00.000Z"
}
```

Success `201`: document summary with `status=draft`.

### 2) Update draft

- `PATCH /api/edm/documents/:id`
- Permission: `documents.update`
- Allowed only for `status=draft` and authorized editor.

Success `200`: updated document summary.

Common errors:
- `409` `EDM_INVALID_STATE_TRANSITION` if document is not editable.

### 3) Submit draft to route

- `POST /api/edm/documents/:id/submit`
- Permission: `documents.update`

Body:

```json
{
  "routeTemplateId": 12,
  "stages": [
    {
      "orderNo": 1,
      "stageType": "review",
      "assigneeType": "department_head",
      "assigneeDepartmentId": 7,
      "dueAt": "2026-02-20T18:00:00.000Z"
    },
    {
      "orderNo": 2,
      "stageType": "approve",
      "assigneeType": "user",
      "assigneeUserId": 2,
      "dueAt": "2026-02-22T18:00:00.000Z"
    }
  ]
}
```

Success `200`:

```json
{
  "documentId": 1011,
  "status": "in_route",
  "routeId": 301,
  "versionNo": 1,
  "externalNumber": "FIN-INTERNAL-2026-000124"
}
```

### 4) Execute stage action

- `POST /api/edm/documents/:id/stages/:stageId/actions`
- Permission: `documents.route.execute`

Body:

```json
{
  "action": "approved",
  "commentText": "Looks good",
  "reasonCode": null
}
```

Allowed actions:
- `approved`
- `rejected`
- `returned_for_revision`
- `commented`

Success `200`: stage action result.

Common errors:
- `403` `EDM_STAGE_NOT_ASSIGNED`
- `409` `EDM_STAGE_ALREADY_CLOSED`
- `409` `EDM_INVALID_STATE_TRANSITION`

### 5) Emergency override (chairperson only)

- `POST /api/edm/documents/:id/override`
- Permission: `documents.route.execute` + global override policy

Body:

```json
{
  "overrideAction": "force_approve",
  "reason": "Legal deadline"
}
```

Success `200`: updated document and route terminal state.

### 6) Archive approved document

- `POST /api/edm/documents/:id/archive`
- Permission: `documents.archive`
- Allowed only when `status=approved`.

Success `200`:

```json
{
  "id": 1011,
  "status": "archived",
  "archivedAt": "2026-02-18T11:40:00.000Z"
}
```

### 7) Attach or detach file

- `POST /api/edm/documents/:id/files/:fileId`
- `DELETE /api/edm/documents/:id/files/:fileId`
- Permissions: `documents.update` + `files.write`

## Queries

### 1) List documents

- `GET /api/edm/documents`
- Permission: `documents.read`
- ABAC-scoped list.

Query params:
- `status`
- `type`
- `departmentId`
- `creatorId`
- `externalNumber`
- `fromDate`
- `toDate`
- `page`
- `limit`

Success `200`:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

### 2) Get document detail

- `GET /api/edm/documents/:id`
- Permission: `documents.read`

Response includes:
- document card
- current route summary
- current active stages
- file links

### 3) Work queues

- `GET /api/edm/queues/inbox`
- `GET /api/edm/queues/outbox`
- `GET /api/edm/queues/my-approvals`
- Permission: `documents.read`

Purpose:
- inbox: incoming docs for role/scope
- outbox: docs created by caller or department
- my-approvals: only actionable stages for caller/delegation

### 4) Route detail

- `GET /api/edm/documents/:id/route`
- Permission: `documents.read`

Response includes:
- route state and version
- ordered stages
- stage actions timeline

### 5) Audit timeline

- `GET /api/edm/documents/:id/audit`
- Permission: `documents.audit.read`

Success `200`: immutable event list with actor + delegation context.

## Delegation-Specific API Behavior

When action is performed under delegation:
- request can optionally carry `X-On-Behalf-Of-User-Id`
- backend validates active delegation grant and scope
- audit event stores:
  - `actorUserId` (delegate)
  - `onBehalfOfUserId` (delegator)

Error:
- `403` `EDM_DELEGATION_INVALID` when grant expired/revoked/out of scope.

## Idempotency And Concurrency

- Mutating commands support `Idempotency-Key` header (recommended for submit/action endpoints).
- Optimistic concurrency via `If-Match` (ETag/version) on `PATCH /documents/:id`.
- Duplicate stage actions with same idempotency key return previous result (`200`).

## Error Codes (v1)

- `EDM_SCOPE_FORBIDDEN`
- `EDM_CONFIDENTIALITY_FORBIDDEN`
- `EDM_DOCUMENT_NOT_FOUND`
- `EDM_STAGE_NOT_FOUND`
- `EDM_STAGE_NOT_ASSIGNED`
- `EDM_STAGE_ALREADY_CLOSED`
- `EDM_INVALID_STATE_TRANSITION`
- `EDM_DELEGATION_INVALID`
- `EDM_NUMBER_ASSIGNMENT_FAILED`
- `EDM_VALIDATION_ERROR`

## Non-Functional Requirements

- p95 list/query endpoints < 300 ms at pilot load.
- audit events must be durable and written in same transaction as stage action.
- every 4xx/5xx from command endpoints must include `code`.

## Acceptance Criteria

- API contract fully maps to lifecycle from functional spec.
- Route actions support sequential and parallel policies.
- Delegation and on-behalf audit context are enforced consistently.
- Contract is sufficient to start NestJS controller/DTO implementation without missing decisions.
