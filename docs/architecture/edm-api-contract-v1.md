# EDM API Contract v1

Last updated: 2026-02-19
Status: implementation-aligned
Base URL: `/api/edm`

## Purpose

Define the EDM API contract aligned with the implemented controller:
- `backend/src/edm/edm.controller.ts`

Related specs:
- `docs/architecture/edm-functional-spec-v1.md`
- `docs/architecture/edm-schema-v1.md`
- `docs/role-permissions-lock-2026-02-19.md`

## Auth And Access

- All endpoints require `Authorization: Bearer <accessToken>`.
- Effective permissions follow backend enum `Permission` and role matrix lock.
- Current backend roles: `admin`, `manager`, `regular`.
- ABAC/policy checks are enforced in service layer (department/self/shared constraints).
- Confidentiality (`public_internal`, `department_confidential`, `restricted`) is enforced after RBAC/ABAC checks for document access paths.

## Permission Set Used By EDM Endpoints

- `documents.create`
- `documents.read`
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
- `tasks.read` (for EDM-task linkage)
- `tasks.create` (for EDM-task linkage)
- `files.read` (for attachments query)
- `files.write` (for attachments link/unlink)
- `reports.read` (for EDM reports and dashboard widgets)

## Endpoint Catalog (Implemented)

### Document Templates

- `POST /api/edm/document-templates` - `documents.templates.write`
- `GET /api/edm/document-templates` - `documents.templates.read`
- `GET /api/edm/document-templates/:id` - `documents.templates.read`
- `PATCH /api/edm/document-templates/:id` - `documents.templates.write`
- `DELETE /api/edm/document-templates/:id` - `documents.templates.write`

### Route Templates

- `POST /api/edm/route-templates` - `documents.route.templates.write`
- `GET /api/edm/route-templates` - `documents.route.templates.read`
- `GET /api/edm/route-templates/:id` - `documents.route.templates.read`
- `PATCH /api/edm/route-templates/:id` - `documents.route.templates.write`
- `DELETE /api/edm/route-templates/:id` - `documents.route.templates.write`

### Registration

- `POST /api/edm/documents/:id/register` - `documents.register`
- `PATCH /api/edm/documents/:id/registration-status` - `documents.register`
- `GET /api/edm/registration-journal` - `documents.register`

### Document And Route Lifecycle

- `POST /api/edm/documents` - `documents.create`
- `PATCH /api/edm/documents/:id` - `documents.update`
- `POST /api/edm/documents/:id/submit` - `documents.update`
- `POST /api/edm/documents/:id/stages/:stageId/actions` - `documents.route.execute`
- `POST /api/edm/documents/:id/override` - `documents.route.execute` (plus policy restriction)
- `POST /api/edm/documents/:id/archive` - `documents.archive`

### Queries (Documents, Queues, Route, Audit)

- `GET /api/edm/documents` - `documents.read`
- `GET /api/edm/documents/:id` - `documents.read`
- `GET /api/edm/queues/inbox` - `documents.read`
- `GET /api/edm/queues/outbox` - `documents.read`
- `GET /api/edm/queues/my-approvals` - `documents.read`
- `GET /api/edm/documents/:id/route` - `documents.read`
- `GET /api/edm/documents/:id/audit` - `documents.audit.read`
- `GET /api/edm/documents/:id/history` - `documents.audit.read` (target timeline API)

### EDM-Tasks Linkage

- `POST /api/edm/documents/:id/resolution-tasks` - `documents.update` + `tasks.create`
- `GET /api/edm/documents/:id/tasks` - `documents.read` + `tasks.read`
- `GET /api/edm/documents/:id/task-progress` - `documents.read` + `tasks.read`

### Alerts

- `POST /api/edm/alerts/process` - `documents.alerts.manage`
- `GET /api/edm/alerts/my` - `documents.alerts.read`
- `PATCH /api/edm/alerts/:id/ack` - `documents.alerts.read`

### Saved Filters

- `POST /api/edm/saved-filters` - `documents.read`
- `GET /api/edm/saved-filters` - `documents.read`
- `PATCH /api/edm/saved-filters/:id` - `documents.read`
- `DELETE /api/edm/saved-filters/:id` - `documents.read`

### Reports And Dashboard

- `GET /api/edm/reports/sla` - `reports.read`
- `GET /api/edm/reports/sla/export` - `reports.read` (CSV)
- `GET /api/edm/reports/sla/export/xlsx` - `reports.read`
- `GET /api/edm/reports/overdue` - `reports.read`
- `GET /api/edm/reports/overdue/export` - `reports.read` (CSV)
- `GET /api/edm/reports/overdue/export/xlsx` - `reports.read`
- `GET /api/edm/reports/workload` - `reports.read`
- `GET /api/edm/reports/workload/export` - `reports.read` (CSV)
- `GET /api/edm/reports/workload/export/xlsx` - `reports.read`
- `GET /api/edm/reports/dashboard` - `reports.read`

### Attachments

- `GET /api/edm/documents/:id/files` - `documents.read` + `files.read`
- `POST /api/edm/documents/:id/files/:fileId` - `documents.update` + `files.write`
- `DELETE /api/edm/documents/:id/files/:fileId` - `documents.update` + `files.write`

### Correspondence And Responsibility (Target Additions)

- `POST /api/edm/documents/:id/forward` - `documents.route.execute`
  - records forwarding hop in timeline (`from -> to`)
- `POST /api/edm/documents/:id/responsible` - `documents.update`
  - assign/reassign responsible executor
- `POST /api/edm/documents/:id/replies` - `documents.read`
  - add reply to document thread (`parentReplyId` optional)
- `GET /api/edm/documents/:id/replies` - `documents.read`
  - list reply chain ordered by `createdAt`

## Core DTO Fragments

Document summary example:

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

Stage action result example:

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

Error envelope example:

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

Document history item example:

```json
{
  "id": 5012,
  "documentId": 1011,
  "eventType": "forwarded",
  "actorUserId": 15,
  "fromUserId": 15,
  "toUserId": 22,
  "responsibleUserId": 22,
  "threadId": "doc-1011-main",
  "createdAt": "2026-02-19T12:20:00.000Z"
}
```

## Delegation Behavior

- Delegation is supported via IAM delegation entities/policies.
- Actions under delegation must be auditable with actor and on-behalf context.
- Delegation invalidity results in forbidden access (`EDM_DELEGATION_INVALID` or equivalent policy-level code).

## Idempotency And Concurrency

- `Idempotency-Key` should be supported for retry-sensitive mutations (`submit`, `stage actions`, override-like operations).
- Version/concurrency checks for draft updates should be enforced at service level.

## Error Code Baseline

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

## Acceptance Criteria

- Contract covers all currently implemented EDM endpoints.
- Permission requirements in docs match decorators in `edm.controller.ts`.
- Lifecycle, templates, alerts, registration, reports, and attachments are represented in one contract.
- History model supports full movement chain + responsible assignment + reply thread reconstruction.
