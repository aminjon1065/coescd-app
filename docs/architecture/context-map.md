# Context Map v1

Last updated: 2026-02-18

## Goal

Define hard domain boundaries for:
- EDM (documents and approval/delegation routes)
- Tasks (manager-to-subordinate execution)
- Files (storage/access/audit service)
- GIS (map layer and geospatial entities)
- Analytics (aggregates, KPIs, map insights)
- IAM (RBAC + ABAC + delegation claims)

## Bounded Contexts

1. IAM
- Owns: users, roles, permissions, org hierarchy links, delegation windows.
- Provides: auth tokens, effective permission resolution, scope predicates.
- Does not own: document workflow, task lifecycle, map geometry.

2. EDM
- Owns: document card, route/stage, sign/approve/reject actions, registry numbers.
- Uses IAM for access checks.
- Uses Files for attachments metadata + access.
- Emits events to Analytics.

3. Tasks
- Owns: task lifecycle, assignee chain, deadlines/SLA, escalation.
- Uses IAM for scope checks.
- Can reference EDM document(s).
- Uses Files for attachments.
- Emits events to Analytics.

4. Files
- Owns: binary storage pointers, file metadata, retention/deletion policy, file access audit.
- Does not own business meaning of a file link.
- Link ownership lives in EDM/Tasks/GIS link tables.

5. GIS
- Owns: incidents/features/layers geometry, geospatial statuses.
- Uses PostGIS primitives and map rendering contracts.
- Can reference tasks/documents/files.
- Emits geo events to Analytics.

6. Analytics
- Owns: read models and aggregates (not source-of-truth transactions).
- Subscribes to domain events from EDM/Tasks/GIS/Files.
- Produces KPI and dashboard/map overlays.

## Context Relationships

- IAM -> EDM/Tasks/Files/GIS (authorization dependency)
- EDM <-> Tasks (reference only through ids/events, no deep cross writes)
- EDM/Tasks/GIS -> Files (attach/link operations)
- EDM/Tasks/GIS/Files -> Analytics (event producer)

Rule:
- Cross-context write is forbidden except through explicit application service/API boundary.

## Integration Style (v1)

- Deployment: modular monolith.
- Integration: in-process domain events + outbox table for future async transport.
- API style: REST for commands/queries; event bus for projections.

## External Integration Direction

- QGIS: read via PostGIS views/materialized views from GIS + Analytics read models.
- Future messaging: Kafka/Rabbit optional after scale threshold.

## Anti-Corruption Rules

- EDM statuses are not reused as task statuses.
- Files never derive permission from direct user role alone; always scoped by owner context + IAM.
- Analytics never mutates transactional tables.
