# Data Model v1

Last updated: 2026-02-18

## Storage Decisions

- PostgreSQL as transactional store.
- PostGIS extension for GIS geometry.
- Object storage (S3/MinIO) for file binaries.
- Redis for short-lived operational state (sessions, idempotency, previews).

## Core Transaction Tables

## IAM

- `users`
- `departments`
- `role_permission_profiles`
- `delegations` (new)
- `auth_audit_logs`
- `user_change_audit_logs`

## EDM

- `documents`
- `document_routes`
- `document_route_stages`
- `document_stage_actions`
- `document_registry` (optional numbering)

## Tasks

- `tasks`
- `task_status_history`
- `task_assignments` (optional if assignment history needed)

## Files

- `files`
- `file_links` (resource_type, resource_id, file_id)
- `file_access_audit`

## GIS

- `incidents` (or existing `disasters` evolved)
- `gis_layers`
- `gis_features`

Geometry columns:
- `incidents.geom geometry(Point, 4326)`
- `gis_features.geom geometry(Geometry, 4326)`

## Analytics Read Models

- `analytics_kpi_daily`
- `analytics_department_snapshots`
- `analytics_incident_heatmap_cells`
- `analytics_task_sla_snapshots`

## Operations/Audit

- `bulk_import_operations`
- `outbox_events` (new)

## Key Constraints

- Soft delete where auditability required.
- Status transitions validated in service layer + DB check constraints where feasible.
- Foreign keys mandatory for all intra-domain links.
- Cross-domain references via ids + events; avoid circular write dependencies.

## Indexing Baseline

- Status + created_at for list queries.
- Department + status for operational filters.
- Assignee/owner + created_at for personal work queues.
- GIST index on PostGIS geometry columns.
- Composite indexes on route stage lookup (`document_id`, `order_no`, `status`).

## QGIS Compatibility

Expose stable views:
- `vw_incidents_current`
- `vw_incident_task_summary`
- `vw_department_risk_score`

Rules:
- Views are read-only for QGIS.
- API remains source of write operations.

## Migration Policy

- `synchronize=false` in all non-test environments.
- Every schema change via migration.
- Up/down tested in CI for latest migration batch.
