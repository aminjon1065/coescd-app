# Domain Workflows v1

Last updated: 2026-02-18

## EDM Workflow

## Document Lifecycle

States:
- `draft`
- `in_route`
- `approved`
- `rejected`
- `returned_for_revision`
- `archived`

Allowed transitions:
- `draft -> in_route`
- `in_route -> approved`
- `in_route -> rejected`
- `in_route -> returned_for_revision`
- `returned_for_revision -> in_route`
- `approved -> archived`

## Route Model

Route consists of ordered stages:
- stage type: `sign` | `approve` | `review`
- assignee type: `user` | `role` | `department_head`
- parallel mode: optional for specific stages

Rules:
- Stage completion required before next stage unless parallel stage group.
- Chairperson can inject emergency override stage.
- All stage actions immutable in audit trail.

## Tasks Workflow

States:
- `new`
- `in_progress`
- `blocked`
- `completed`
- `cancelled`
- `overdue` (derived or materialized)

Rules:
- Department head/deputy assign within scope.
- Reassign requires reason.
- SLA timestamps recorded (`dueAt`, `completedAt`, `breachAt`).

## Files Workflow

States:
- `uploaded`
- `active`
- `deleted` (soft delete)
- `purged` (retention final)

Rules:
- Files are attached to business resources by link table.
- Access resolved by parent resource scope + direct file permissions.
- Download, preview, delete always audited.

## GIS Workflow

Entity: incident/feature.

States:
- `detected`
- `confirmed`
- `responding`
- `resolved`

Rules:
- Geometry required for map rendering.
- Severity and status updates emit analytics events.
- Cross-links to tasks/documents/files by foreign key relations.

## Cross-Context User Scenarios

1. Incident-to-Task-to-Document
- Create GIS incident.
- Create task assigned to subordinate.
- Attach evidence files.
- Create EDM document for approval route.

2. Department Delegation Day
- Department head delegates sign rights to deputy for time window.
- Deputy processes EDM stages and task escalations.
- Audit shows delegated context.

3. Chairperson Broadcast Document
- Create cross-department document route.
- Parallel department approvals.
- Analytics shows completion lag by department.

## Event Contract (minimum)

Producers emit:
- `document.created`, `document.stage.completed`, `document.status.changed`
- `task.created`, `task.assigned`, `task.status.changed`
- `file.attached`, `file.downloaded`, `file.deleted`
- `incident.created`, `incident.status.changed`

Consumer:
- Analytics projector updates KPI read models.
