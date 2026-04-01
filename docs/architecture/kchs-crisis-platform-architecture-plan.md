# KCHS Crisis Platform Architecture Plan

Last updated: 2026-04-01
Status: In Progress
Owner: Architecture / Backend

This document is the working architecture baseline for the KCHS crisis management platform. It is intended to be updated as implementation progresses so design decisions, scope changes, and delivery status stay synchronized.

## 1. Goal

Build a practical GovTech platform for KCHS that combines:
- CRM / incidents
- document management (EDM)
- task management
- communications
- analytics

Constraints:
- small implementation team
- no unnecessary enterprise complexity
- deployable with Docker Compose
- backend based on NestJS
- main operational data in PostgreSQL
- analytics isolated in a separate service and database

## 2. Architecture Principles

- Use a modular monolith for core operational workflows.
- Split analytics into a separate service because it has a different data model, access profile, and scaling path.
- Prefer Postgres, Redis, MinIO, and simple queues over Kafka or a microservice mesh.
- Keep authorization explicit and inspectable: RBAC first, ABAC only where needed.
- Treat files and recordings as object storage assets, not database blobs.
- Build for operational reliability with backups, replicas, and monitoring from day one.

## 3. High-Level Architecture

### 3.1 Main Components

- `frontend`: Next.js web client
- `core-api`: NestJS modular monolith
- `analytics-api`: separate NestJS service
- `postgres-main`: main operational database
- `postgres-analytics`: analytics database
- `redis`: cache, websocket adapter, queue backend
- `minio`: object storage for files and recordings
- `jitsi` or `livekit`: audio/video/conference provider
- `nginx`: reverse proxy / entry point
- `prometheus`, `grafana`, `alertmanager`: observability stack

### 3.2 Core Backend Modules

The `core-api` should contain:
- `auth`
- `users`
- `roles-permissions`
- `org-structure`
- `incidents`
- `tasks`
- `documents`
- `chat`
- `notifications`
- `integrations`
- `audit-log`

### 3.3 Analytics Service

The `analytics-api` should be isolated from the main backend and expose:
- dashboards
- maps / geo layers
- aggregated indicators
- forecasting endpoints
- BI-oriented datasets

Access is allowed only to:
- `Super Admin`
- `Analyst`
- optionally specific executive roles if explicitly granted later

## 4. Role Model

The security model should distinguish:
- system role
- organizational unit
- position
- delegated authority

### 4.1 System Roles

| Role | Purpose |
|---|---|
| Super Admin | Full access to all modules, settings, users, roles, integrations |
| Chairman | Full visibility across KCHS operations and approvals |
| Deputy Chairman | Visibility across assigned verticals or globally by policy |
| Department Head | Access to own department and child units |
| Division Head | Access to own division/section and child units |
| Employee | Standard operational access within assigned unit |
| Analyst | Employee rights plus access to analytics service |
| Registrar / EDM Operator | Expanded document workflow and registration permissions |
| Duty Officer / Dispatcher | Expanded incident and communications permissions |
| Auditor / ReadOnly | Read-only access to permitted scopes |

### 4.2 Organizational Structure

The org hierarchy should support:
- Chairman
- Deputies
- Departments / Directorates / Управления
- Divisions / Отделы
- Sections / Отделения

Suggested entity:
- `org_units`

Fields:
- `id`
- `name`
- `type`
- `parent_id`
- `code`
- `manager_user_id`
- `is_active`

Suggested unit types:
- `CHAIRMAN_OFFICE`
- `DEPUTY_BLOCK`
- `DEPARTMENT`
- `DIVISION`
- `SECTION`

### 4.3 Positions

Suggested entity:
- `positions`

Examples:
- chairman
- deputy chairman
- department head
- division head
- section head
- employee
- analyst
- registrar
- dispatcher

### 4.4 Delegation

Delegation is required for real operations.

Suggested entity:
- `delegations`

Fields:
- `delegator_user_id`
- `delegate_user_id`
- `scope_type`
- `scope_id`
- `permissions`
- `starts_at`
- `ends_at`
- `status`

Use cases:
- temporary document approval delegation
- task approval delegation
- duty officer replacement for a shift

## 5. Access Control Model

Use:
- `RBAC` for module access and actions
- simple `ABAC` for scope filtering

Do not build a complex policy engine.

### 5.1 RBAC

Permissions should be granular enough for backend enforcement, for example:
- `incidents.read`
- `incidents.create`
- `incidents.update`
- `incidents.assign`
- `tasks.read`
- `tasks.manage_department`
- `documents.read`
- `documents.approve`
- `documents.register`
- `chat.access`
- `communications.start_call`
- `analytics.read`
- `analytics.export`
- `admin.manage_users`
- `admin.manage_roles`

### 5.2 ABAC Rules

ABAC should be limited to a few consistent checks.

#### Organizational Scope

A user can access:
- their own records
- records of their own unit
- records of child units
- all records if they have global authority

#### Incident Scope

A user can access an incident if:
- they created it
- they are assigned to it
- their unit owns it
- they are a participant or watcher
- they have higher-level visibility

#### Document Scope

A user can access a document if:
- they are the author
- they are the executor
- they are in the approval route
- the document belongs to their unit
- they are a manager above the owning unit

#### Analytics Scope

Access only if:
- the user has `Analyst` or `Super Admin` role
- and the backend issues analytics-specific permission flags

### 5.3 Backend Enforcement

In NestJS:
- JWT stores user identity and scope basics
- `RolesGuard` checks permissions
- `AccessPolicyService` evaluates resource access

Examples:
- `canViewIncident(user, incident)`
- `canApproveDocument(user, document)`
- `canManageTask(user, task)`

The UI may hide modules, but only backend checks are authoritative.

## 6. Database Architecture

## 6.1 Main Database: `postgres-main`

This is the system of record for operational workflows.

Store in main DB:
- users
- roles and permissions
- org structure
- incidents
- tasks
- documents
- document workflows
- chat metadata and messages
- notifications
- call and conference metadata
- file metadata
- audit logs
- integration state

Suggested main tables:
- `users`
- `roles`
- `permissions`
- `user_roles`
- `org_units`
- `positions`
- `delegations`
- `incidents`
- `incident_participants`
- `incident_events`
- `tasks`
- `documents`
- `document_versions`
- `document_workflow_steps`
- `files`
- `chat_rooms`
- `chat_messages`
- `message_attachments`
- `calls`
- `call_participants`
- `conference_records`
- `notifications`
- `audit_logs`
- `outbox_events`

## 6.2 Analytics Database: `postgres-analytics` or `ClickHouse`

Practical recommendation:
- start with `PostgreSQL`
- move heavy event and aggregate workloads to `ClickHouse` only if volume demands it

Store in analytics DB:
- aggregated incident metrics
- operational KPIs
- geo layers and heatmaps
- time-series summaries
- forecasting inputs and outputs
- BI-friendly reporting datasets

Do not use analytics DB as the source of truth for:
- user permissions
- document workflow state
- operational transaction state

## 7. Data Flow To Analytics

The system should avoid Kafka and keep synchronization understandable.

### 7.1 Recommended Pattern

- `core-api` writes operational data to `postgres-main`
- on important business actions, `core-api` writes event records to `outbox_events`
- a worker reads pending outbox records
- worker publishes jobs via Redis queue or sends HTTP calls to `analytics-api`
- `analytics-api` transforms and stores data in analytics DB

### 7.2 What Should Flow Into Analytics

- incident created / updated / closed
- incident severity changes
- task status changes
- document registration / approval milestones
- communication activity metrics
- geo coordinates and operational map events
- response-time and workload metrics

### 7.3 Sync Modes

- near real-time data: queue-based every 1-5 minutes
- hourly aggregates: scheduled jobs
- nightly forecast jobs: cron-based

This is enough for an initial KCHS deployment.

## 8. Communications Architecture

## 8.1 Chat

Chat should be implemented inside `core-api` using:
- `Socket.IO`
- `Redis adapter`

Responsibilities:
- room membership
- message persistence
- delivery status
- attachments through MinIO
- optional incident/task/document linked chats

Store in main DB:
- chat rooms
- membership
- messages
- attachment links
- read receipts if needed

## 8.2 Audio / Video / Conference

Do not build in-house media infrastructure.

Use:
- `Jitsi` for faster deployment and simpler conference setup
- `LiveKit` only if advanced real-time media workflows become necessary

Recommended initial choice:
- `Jitsi`

### Integration Flow

- frontend requests room creation from `core-api`
- `core-api` checks permissions and context
- `core-api` creates or signs meeting metadata
- frontend joins room through Jitsi SDK / iframe integration
- `core-api` stores metadata in `postgres-main`

### Store In Database

- `room_id`
- `call_type`
- `initiator_user_id`
- `related_incident_id`
- `related_task_id`
- `participants`
- `started_at`
- `ended_at`
- `status`
- `recording_file_id`

### Recordings

Recordings should be stored in:
- `MinIO`

Database stores only:
- object reference
- recording metadata
- retention info

## 9. Storage Architecture

Use `MinIO` for:
- document files
- incident attachments
- task attachments
- chat attachments
- exported reports
- call and conference recordings
- document templates

### 9.1 File Metadata

Database table should store:
- `bucket`
- `object_key`
- `original_name`
- `content_type`
- `size`
- `checksum`
- `uploaded_by`
- `version`
- `created_at`

### 9.2 Document Versioning

Each document version should:
- have its own database record
- reference its own MinIO object
- preserve previous immutable versions

Suggested tables:
- `documents`
- `document_versions`
- `files`

### 9.3 File Access

Access pattern:
- backend validates permissions
- backend issues presigned URL
- no public direct bucket access

## 10. Resilience And Backup

## 10.1 PostgreSQL

Minimum target:
- one `primary`
- one `hot standby`

### Backup Strategy

- nightly full backups
- continuous WAL archiving
- copy backups to separate storage
- monthly restore drill

### Recovery Strategy

- primary fails
- standby promoted manually according to runbook
- old primary reintroduced later as standby

Manual failover is acceptable for a small team and is easier to operate safely.

## 10.2 Redis

Minimum target:
- `AOF` enabled
- `RDB` snapshots enabled
- daily backup of dumps/config

Redis should not hold system-of-record data.

If Redis is lost:
- cache is rebuilt
- websocket sessions reconnect
- queued non-critical jobs may be replayed if needed

## 10.3 MinIO

Minimum target:
- replication to secondary target or
- scheduled backup to separate storage

Suggested policy:
- nightly sync backup
- weekly full verification
- checksum validation for critical files

## 10.4 What Must Be Backed Up

- PostgreSQL main
- PostgreSQL analytics
- MinIO buckets
- Redis dumps
- environment files and secrets backups
- Nginx / Compose / operational configs

## 11. Logging, Metrics, Alerts

## 11.1 Logging

Start simple.

Recommended initial approach:
- structured JSON app logs
- log files on host
- `logrotate`

Log streams:
- `core-api`
- `analytics-api`
- worker jobs
- nginx
- postgres
- auth / audit events

If log volume grows, move to:
- `Loki + Promtail + Grafana`

## 11.2 Metrics

Recommended stack:
- `Prometheus`
- `Grafana`
- `node_exporter`
- `postgres_exporter`
- `redis_exporter`
- `cadvisor`

Minimum metrics:
- CPU
- RAM
- disk usage
- DB connections
- Postgres replication lag
- Redis memory
- queue backlog
- API latency
- API 5xx rate

## 11.3 Alerts

Recommended delivery:
- `Alertmanager -> Telegram`

Minimum alert rules:
- API down
- analytics service down
- PostgreSQL down
- replication lag above threshold
- disk usage above threshold
- Redis unavailable
- MinIO unavailable
- abnormal 5xx spike
- queue backlog growing continuously

## 12. Sidebar And UI Visibility

The frontend should render menus from backend-provided permissions and module flags.

Do not hardcode module visibility only by role name.

### 12.1 Backend Should Return

- user profile
- roles
- org unit
- permission list
- module access flags

Example flags:
- `canAccessAnalytics`
- `canApproveDocuments`
- `canManageDepartment`
- `canViewAllIncidents`
- `canManageUsers`

### 12.2 Sidebar Rules

Show only modules the user can access:
- Incidents
- Documents
- Tasks
- Chat
- Communications
- Analytics
- Administration

### 12.3 Expected Visibility Examples

`Employee`
- incidents
- tasks
- documents
- chat
- communications if allowed
- no analytics
- no admin

`Department Head`
- employee modules
- department oversight screens
- approvals and reporting in own scope

`Analyst`
- employee modules
- analytics module

`Super Admin`
- all modules

## 13. Deployment Model

Recommended deployment model:
- Docker Compose on one primary application server group
- separate database host(s) if possible
- reverse proxy via Nginx
- TLS termination at Nginx

### Suggested Compose-Level Services

- `frontend`
- `core-api`
- `analytics-api`
- `worker`
- `postgres-main`
- `postgres-analytics`
- `redis`
- `minio`
- `nginx`
- `jitsi`
- `prometheus`
- `grafana`
- `alertmanager`

## 14. Delivery Phases

### Phase 1

- auth
- users
- roles and permissions
- org structure
- incidents
- tasks
- documents
- MinIO integration
- audit logging
- basic RBAC + ABAC

### Phase 2

- chat over WebSocket
- notifications
- Jitsi integration
- document routing and approval workflows

### Phase 3

- analytics service
- outbox + sync pipeline
- geo dashboards
- forecasting

## 15. Open Decisions

- choose `Jitsi` vs `LiveKit` formally
- decide whether analytics starts on PostgreSQL or immediately on ClickHouse
- define exact department taxonomy for KCHS
- define which executive roles get analytics visibility besides Analysts
- define retention rules for recordings and attachments

## 16. Implementation Status

### Completed

- Architecture baseline document created
- First implementation increment started
- Analytics access narrowed in code to `Admin` and `Analyst`
- Frontend analytics route protection aligned with backend role model
- User API extended with `orgUnit` and `businessRole`
- Read-only `org-units` API added for the new org hierarchy
- Frontend auth/user types aligned with expanded KCHS role model
- Users admin UI aligned with `orgUnit` and `businessRole`
- Departments admin UI extended with `org_units` hierarchy management
- `org_units` backend CRUD implemented with path recalculation and cycle protection
- Users bulk import updated to support `orgUnit` and `businessRole` fields while keeping legacy `department_*` compatibility
- Legacy task routing now validates assignee changes against actor scope and subtree access
- Legacy documents now support optional `orgUnit` ownership for scope-aware routing while preserving `department` compatibility
- EDM v2 documents now support `orgUnit` as primary create/filter field with UI support in `/dashboard/documents`
- EDM v2 visibility and mutating actions are now enforced through `owner + orgUnit subtree + department fallback + workflow assignment`
- EDM v2 workflow assignee resolution now prefers real org leadership (`department.chief`, `orgUnit` + `businessRole`) instead of owner fallback

### Next

- move remaining admin and routing flows from `department`-first logic to `org_units` as the primary structure
- decide whether legacy `/dashboard/documentation` should also be migrated to `orgUnit` or deprecated behind the v2 flow
- start dedicated analytics sync/outbox implementation
- align remaining dynamic workflow assignee rules with richer org metadata and delegation context

## 17. Synchronization Rules For This Document

When implementation progresses, update this file for:
- accepted architecture changes
- final role names and permission sets
- chosen integrations
- actual database split
- backup and monitoring decisions
- implementation status by phase

Recommended update cadence:
- after each architecture decision
- after each completed phase
- before production rollout
