# KCHS Platform Master Plan From Scratch

Last updated: 2026-04-02
Status: Draft for clean-start implementation
Audience: product, architecture, backend, frontend, devops, QA

## 1. Purpose

This document is the ideal implementation plan for building the KCHS crisis platform from zero while avoiding the main failure modes seen in similar GovTech systems:

- domain duplication
- parallel legacy and v2 flows without a sunset plan
- mixed ownership of data across modules
- permissions implemented after features instead of before
- analytics mixed into operational code and database
- infrastructure and recovery deferred until too late

This plan assumes:

- one primary web frontend
- one operational backend (`core-api`)
- one separate analytics backend (`analytics-api`)
- one worker service for outbox, notifications, exports, analytics sync
- PostgreSQL for operational data
- PostgreSQL or ClickHouse for analytics data
- Redis, MinIO, Docker Compose, Nginx, Prometheus, Grafana, Alertmanager

## 2. Non-Negotiable Rules

These rules are mandatory. If any of them are violated, the implementation is considered off-plan.

### 2.1 Architecture Rules

- `core-api` is the single source of truth for operational workflows.
- `analytics-api` is a separate service with a separate database.
- `analytics-api` never becomes the source of truth for permissions or operational transactions.
- `worker` is a separate runtime for asynchronous jobs.
- no feature may directly read another module's private tables without an explicit repository or service boundary
- no frontend screen may be built before backend contract, permissions, and workflow rules are agreed
- no new module may be added without a clear owner, entity list, permission namespace, and event list

### 2.2 Data Rules

- only one canonical org model: `org_units`
- `department` may exist only as an `org_unit.type`, not as a competing parallel model
- `files` store metadata in DB and binaries in MinIO only
- no blobs in PostgreSQL except small structured payloads
- every state transition must be explicit and auditable
- every write-side schema change must be delivered through migrations
- `synchronize=false` in all non-test environments

### 2.3 Delivery Rules

- no module reaches frontend before backend e2e coverage exists for critical paths
- no legacy/v2 duality without a written migration and deprecation plan
- no analytics dashboard before event contracts and sync pipeline exist
- no production rollout before backup, restore, metrics, and alerting are live

## 3. Product Goal

Build a crisis management platform for KCHS that combines:

- incidents and operational response
- EDM and document workflows
- task assignment and control
- communications
- GIS and map-based situational awareness
- analytics and executive reporting

The platform must support:

- central leadership
- department and subdivision hierarchies
- 200+ users
- explicit permissions
- delegated authority
- auditable operational workflows

## 4. Target Architecture

## 4.1 Runtime Services

Required services:

- `frontend` - Next.js application
- `core-api` - NestJS modular monolith for operational workflows
- `analytics-api` - NestJS service for BI, KPI, datasets, forecasting
- `worker` - job consumer for outbox, notifications, exports, analytics sync
- `postgres-main` - main operational PostgreSQL
- `postgres-analytics` - analytics PostgreSQL
- `redis` - queue backend, cache, websocket adapter, rate-limit state
- `minio` - file and recording object storage
- `nginx` - reverse proxy and TLS termination
- `jitsi` - initial conferencing provider
- `prometheus`
- `grafana`
- `alertmanager`

Optional later:

- `clickhouse` - heavy analytics workloads if PostgreSQL becomes insufficient
- `loki` + `promtail` - centralized logs if JSON file logs become insufficient

## 4.2 Service Responsibilities

`core-api` owns:

- IAM
- org hierarchy
- users
- incidents
- tasks
- documents
- files metadata
- chat and call metadata
- notifications
- audit log
- outbox events

`analytics-api` owns:

- KPI calculations
- dashboard configurations
- read-optimized datasets
- report generation metadata
- analytical GIS layers
- forecasting inputs and outputs
- analytical access rules

`worker` owns:

- outbox dispatch
- analytics sync jobs
- report generation
- notification fan-out
- retention cleanup
- scheduled calculations

## 4.3 Bounded Contexts

The system is split into these bounded contexts:

- `iam`
- `org`
- `users`
- `files`
- `incidents`
- `tasks`
- `documents`
- `notifications`
- `chat`
- `communications`
- `audit`
- `analytics`
- `integrations`

Each context must define:

- owner
- entities
- commands
- queries
- permission namespace
- emitted events
- consumed events
- read model needs

## 5. Repository Structure

Recommended repository layout:

```text
/
  frontend/
  core-api/
  analytics-api/
  worker/
  infra/
    compose/
    nginx/
    prometheus/
    grafana/
    alertmanager/
    backup/
  docs/
    architecture/
    api/
    runbooks/
    adr/
```

Rules:

- do not keep analytics code under `core-api`
- do not keep worker jobs inside request-response modules unless they are thin publishers
- keep generated clients/contracts versioned from backend specs

## 6. Canonical Domain Rules

## 6.1 Identity and IDs

- all public-facing resources use UUIDs unless there is a strict reason for incremental IDs
- internal numeric IDs are acceptable for lookup tables only
- human-facing numbers such as document registration numbers must be separate business fields

## 6.2 Time Rules

- all timestamps stored as UTC `timestamptz`
- every workflow entity has `created_at`, `updated_at`
- status transitions record `occurred_at`

## 6.3 Audit Rules

All protected mutations must record:

- actor user id
- effective roles
- delegation context
- resource type
- resource id
- action
- result
- denial reason if rejected
- request correlation id

## 6.4 Deletion Rules

- soft delete for auditable business entities
- hard delete only for temporary or replaceable support data
- file binaries are purged only through retention workflow, never on casual delete

## 6.5 API Rules

- REST for CRUD and workflow commands
- Socket.IO only for chat, live notifications, and live collaboration
- analytics exports may use async job + polling pattern
- all list endpoints support pagination, filters, sort, and default stable ordering

## 7. Permission Model

## 7.1 Access Strategy

Use:

- RBAC for base capability
- ABAC for scope filtering
- delegation for temporary authority transfer

No complex external policy engine in v1.

## 7.2 Role Dimensions

The system distinguishes:

- system role
- org unit
- business role or position
- delegation context

### 7.2.1 System Roles

- `super_admin`
- `chairman`
- `deputy_chairman`
- `department_head`
- `division_head`
- `section_head`
- `employee`
- `analyst`
- `registrar`
- `duty_officer`
- `auditor`

### 7.2.2 Business Roles and Positions

These are not the same as system roles.

Examples:

- chairman
- deputy
- chief_of_staff
- department_head
- division_head
- section_head
- registrar
- dispatcher
- analyst
- operator

## 7.3 Scope Model

Allowed scopes:

- `global`
- `org_unit`
- `org_subtree`
- `self`
- `workflow_shared`
- `incident_participant`
- `task_assignee`

## 7.4 Delegation Rules

Delegation fields:

- `delegator_user_id`
- `delegate_user_id`
- `scope_type`
- `scope_org_unit_id`
- `permission_subset`
- `valid_from`
- `valid_to`
- `status`

Rules:

- delegation must be time-bound
- no circular delegation
- delegate cannot grant more than received
- all delegated actions show both actor and delegator in audit

## 7.5 Permission Namespace Convention

Format:

- `module.resource.action`

Examples:

- `iam.user.read`
- `iam.user.manage`
- `org.unit.read`
- `incidents.case.read`
- `incidents.case.assign`
- `tasks.task.update`
- `documents.route.approve`
- `files.object.download`
- `chat.room.write`
- `communications.call.start`
- `analytics.dashboard.read`

## 8. Master Module Plan

Each module below includes scope, data, API, permissions, events, and acceptance criteria.

## 8.1 IAM Module

### Responsibilities

- authentication
- session lifecycle
- refresh rotation
- password policy
- csrf for cookie-based operations
- auth rate limit and lockout
- role matrix
- permission evaluation bootstrap

### Core Entities

- `users`
- `sessions`
- `role_permission_profiles`
- `custom_user_permissions`
- `auth_audit_logs`
- `password_change_events`

### Required Features

- sign in
- sign out
- refresh token rotation
- logout from all devices
- password change
- account activation and deactivation
- account lockout after failed attempts
- CSRF for refresh and logout
- safe profile response with permissions and scope info

### API Groups

- `POST /auth/sign-in`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/change-password`
- `GET /auth/me`
- `GET /iam/roles`
- `GET /iam/permissions`
- `GET /iam/matrix`
- `PATCH /iam/matrix`

### Permissions

- `iam.auth.self`
- `iam.matrix.read`
- `iam.matrix.update`
- `iam.audit.read`

### Events

- `iam.user.signed_in`
- `iam.user.signed_out`
- `iam.user.locked`
- `iam.password.changed`
- `iam.matrix.updated`

### Done Criteria

- all auth routes audited
- refresh rotation enforced
- role matrix editable through admin UI and API
- e2e matrix covers allow and deny cases

## 8.2 Org Module

### Responsibilities

- org hierarchy
- org subtree resolution
- manager lookup
- business roles and positions
- delegation storage and validation

### Core Entities

- `org_units`
- `org_unit_types`
- `positions`
- `user_org_assignments`
- `delegations`

### Required Features

- create, update, archive org unit
- tree and subtree queries
- manager assignment
- business role assignment
- delegation create, revoke, expire
- cycle protection
- org path recalculation

### API Groups

- `GET /org/units`
- `GET /org/units/tree`
- `GET /org/units/:id`
- `POST /org/units`
- `PATCH /org/units/:id`
- `POST /org/delegations`
- `PATCH /org/delegations/:id/revoke`

### Permissions

- `org.unit.read`
- `org.unit.manage`
- `org.delegation.read`
- `org.delegation.manage`

### Events

- `org.unit.created`
- `org.unit.updated`
- `org.unit.archived`
- `org.delegation.created`
- `org.delegation.revoked`

### Done Criteria

- subtree queries performant
- manager resolution deterministic
- delegation constraints enforced

## 8.3 Users Module

### Responsibilities

- user profile management
- user lifecycle
- org and role assignment
- bulk onboarding
- admin user operations

### Core Entities

- `users`
- `user_status_history`
- `bulk_import_operations`
- `bulk_import_errors`

### Required Features

- create user
- update profile
- activate and deactivate user
- assign system role
- assign business role
- assign org unit
- bulk CSV import with dry-run
- idempotent upsert
- batch activation and deactivation

### API Groups

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/activate`
- `PATCH /users/:id/deactivate`
- `POST /users/import/dry-run`
- `POST /users/import/apply`

### Permissions

- `iam.user.read`
- `iam.user.create`
- `iam.user.update`
- `iam.user.manage_status`
- `iam.user.bulk_import`

### Events

- `user.created`
- `user.updated`
- `user.activated`
- `user.deactivated`
- `user.import.completed`

### Done Criteria

- 200+ users importable in one controlled flow
- all bulk actions auditable
- no direct DB work needed for onboarding

## 8.4 Files Module

### Responsibilities

- upload and download flow
- object metadata
- file linking to domain resources
- retention and audit
- preview and presigned URLs

### Core Entities

- `files`
- `file_versions`
- `file_links`
- `file_access_audit`
- `file_share_links`

### Required Features

- upload initiate
- upload complete
- download URL issue
- preview URL issue
- delete and restore
- link and unlink to resources
- checksum verification
- content type validation
- size limit validation
- retention class support

### API Groups

- `POST /files/upload-url`
- `POST /files/upload-complete`
- `GET /files/:id`
- `GET /files/:id/download-url`
- `GET /files/:id/preview-url`
- `DELETE /files/:id`
- `POST /files/:id/links`
- `DELETE /files/:id/links/:linkId`

### Permissions

- `files.object.read`
- `files.object.upload`
- `files.object.delete`
- `files.object.share`

### Events

- `file.uploaded`
- `file.activated`
- `file.linked`
- `file.downloaded`
- `file.deleted`
- `file.purged`

### Done Criteria

- all downloads permission-checked
- no public bucket access
- all access audited

## 8.5 Incidents Module

This is the primary operational domain. It must exist before analytics and before advanced GIS.

### Responsibilities

- incident intake
- classification
- severity and status workflow
- ownership and participants
- incident timeline
- links to tasks, documents, files, chats, and calls
- operational response tracking

### Core Entities

- `incidents`
- `incident_types`
- `incident_status_history`
- `incident_participants`
- `incident_events`
- `incident_locations`
- `incident_links`

### Required Features

- create incident
- verify incident
- update status
- set severity
- assign owning org unit
- add participants and watchers
- add timeline event
- attach files
- create linked tasks
- create linked documents
- start linked chat room
- start linked conference

### Workflow

States:

- `draft`
- `reported`
- `verified`
- `active`
- `controlled`
- `closed`
- `archived`

### API Groups

- `GET /incidents`
- `GET /incidents/:id`
- `POST /incidents`
- `PATCH /incidents/:id`
- `POST /incidents/:id/verify`
- `POST /incidents/:id/close`
- `POST /incidents/:id/participants`
- `POST /incidents/:id/events`

### Permissions

- `incidents.case.read`
- `incidents.case.create`
- `incidents.case.update`
- `incidents.case.assign`
- `incidents.case.close`
- `incidents.event.create`

### Events

- `incident.created`
- `incident.verified`
- `incident.status.changed`
- `incident.severity.changed`
- `incident.participant.added`

### Done Criteria

- incident lifecycle fully enforced
- incident access policy implemented and tested
- linked resources resolvable from incident card

## 8.6 Operational GIS Module

This module belongs to `core-api`, not `analytics-api`.

### GIS Principles

- the map is a primary operational workspace, not a decorative dashboard
- operational GIS and analytical GIS must be separated by ownership and runtime
- operational geometry is stored in `postgres-main` and owned by `core-api`
- analytical overlays are derived in `analytics-api`
- native PostGIS geometry is the source of truth; GeoJSON is an API transport format, not the primary storage model
- every map object must have a clear owner context: incident, org unit, task, document, infrastructure, or reference layer

### Responsibilities

- operational incident map
- live incident geometry and field annotations
- operational layers and overlays
- feature management for field operations
- geofences and affected zones
- map-based search and triage
- spatial linking of incidents, tasks, documents, and files
- import and export of common geospatial formats
- integration surface for QGIS and future field/mobile tools

### Core Entities

- `gis_layers`
- `gis_features`
- `gis_feature_geometries`
- `gis_feature_snapshots`
- `gis_geofences`
- `gis_saved_views`
- `gis_import_jobs`
- `gis_export_jobs`
- `incident_locations`

### Layer Types

Operational layer types:

- `incident_points`
- `incident_areas`
- `critical_infrastructure`
- `resources`
- `response_zones`
- `weather_watch`
- `seismic_watch`
- `admin_boundaries`
- `temporary_field_annotations`

### Geometry Types

Supported geometry types:

- `Point`
- `MultiPoint`
- `LineString`
- `MultiLineString`
- `Polygon`
- `MultiPolygon`

Canonical rules:

- store geometry in PostGIS `geometry` columns
- store SRID `4326` as canonical write-side coordinate system
- transform to `3857` or provider-specific web projection only for rendering
- do not keep latitude and longitude as the only source of spatial truth once full GIS is introduced

### Map-Centric User Scenarios

1. Duty officer incident intake
- click map or search location
- create incident at point or draw affected polygon
- assign severity and owning org unit
- attach first evidence files

2. Department operations map
- filter active incidents by status, severity, time, and subtree
- open side panel with linked tasks, documents, calls, and files
- add temporary field annotations and operational zones

3. Response coordination
- draw perimeter or evacuation zone
- find nearby resources or infrastructure
- create tasks from map selection
- start linked communication room

4. Executive situational awareness
- see only approved operational overlays
- switch between current incidents, response zones, and infrastructure exposure
- move from map object to incident timeline without analytical DB dependency

5. GIS operator workflow
- import GeoJSON, KML, Shapefile, or CSV with coordinates
- validate CRS, geometry, and attribute schema
- publish validated features into selected layer

### Required Features

- create operational layer
- activate, archive, and reorder layers
- create feature
- edit point, line, and polygon geometry
- drag point feature
- draw polygon and polyline on map
- filter by severity, status, org unit, time range, and layer
- bbox search
- radius search
- intersects and contains spatial queries
- cluster current incidents
- map detail panel with linked objects
- search by address, coordinates, or reference code
- geofence creation and management
- saved views with filters and visible layers
- import GeoJSON
- import KML
- import Shapefile
- import CSV with coordinate mapping
- export GeoJSON
- export filtered map result set
- audit all geometry mutations
- attach files and photos to map objects through `files`
- link map object to incident, task, or document
- compare current state with previous geometry snapshot

### Spatial Query Capabilities

Required queries:

- within bounding box
- within radius from coordinate
- intersects polygon
- contained by polygon
- nearest N features
- features by org subtree
- features by temporal window
- features by linked incident status

### API Groups

- `GET /gis/layers`
- `GET /gis/layers/:id`
- `POST /gis/layers`
- `PATCH /gis/layers/:id`
- `POST /gis/layers/:id/publish`
- `GET /gis/features`
- `GET /gis/features/:id`
- `POST /gis/features`
- `PATCH /gis/features/:id`
- `POST /gis/features/:id/snapshot`
- `POST /gis/features/import`
- `POST /gis/features/export`
- `POST /gis/query/bbox`
- `POST /gis/query/radius`
- `POST /gis/query/intersects`
- `GET /gis/views`
- `POST /gis/views`
- `POST /gis/geofences`
- `GET /gis/reference/admin-boundaries`

### Permissions

- `gis.layer.read`
- `gis.layer.manage`
- `gis.feature.read`
- `gis.feature.manage`
- `gis.feature.import`
- `gis.feature.export`
- `gis.query.advanced`
- `gis.view.manage`
- `gis.reference.read`

### Events

- `incident.location.created`
- `incident.location.updated`
- `gis.feature.created`
- `gis.feature.updated`
- `gis.feature.deleted`
- `gis.feature.imported`
- `gis.geofence.created`

### QGIS and External GIS Integration

Required support:

- read-only PostGIS views for QGIS
- export endpoints for operational subsets
- import pipeline for curated GIS datasets
- stable layer identifiers for external consumers

Rules:

- external GIS tools are read-only by default
- writes return through API or validated import jobs
- imported geometry must pass CRS and topology validation

### Frontend Map UX Requirements

- map page must work as a daily operations screen, not as a demo view
- side panel with selection details and linked business objects
- fast filter bar for severity, status, org unit, layer, and time
- visible layer control and legend
- drawing toolbar for point, line, polygon, geofence
- time slider for recent operational activity
- mobile and tablet usable layout for field supervisors
- support for keyboard-friendly coordinate entry

### Performance Requirements

- initial map load with active operational layers under target dataset size must render quickly on desktop
- viewport-scoped API queries for large layers
- clustering for high-volume point layers
- indexes required on geometry, status, severity, org unit, and created time
- server-side pagination and lazy loading for side-panel lists

### Done Criteria

- geometry validation enforced
- operational map loads from `core-api` without analytics dependency
- incident geometry is editable and auditable
- spatial queries are tested and permission-aware
- import and export jobs exist for operational GIS staff
- QGIS-compatible read views are available without bypassing domain ownership

## 8.7 Tasks Module

Only one canonical tasks domain is allowed. No parallel legacy and advanced task systems.

### Responsibilities

- work assignment
- assignee and org scope control
- comments
- checklist
- delegation chain
- escalations
- reporting fields

### Core Entities

- `tasks`
- `task_assignments`
- `task_comments`
- `task_checklist_items`
- `task_history`
- `task_delegation_chain`
- `task_escalation_rules`

### Required Features

- create task
- assign user
- assign org unit
- assign business role
- reassign with reason
- change status
- add checklist
- add comment
- attach files
- link to incident
- link to document
- escalate overdue task

### Workflow

States:

- `new`
- `assigned`
- `in_progress`
- `blocked`
- `completed`
- `closed`
- `cancelled`

### API Groups

- `GET /tasks`
- `GET /tasks/:id`
- `POST /tasks`
- `PATCH /tasks/:id`
- `POST /tasks/:id/assign`
- `POST /tasks/:id/status`
- `POST /tasks/:id/comments`
- `GET /tasks/:id/history`

### Permissions

- `tasks.task.read`
- `tasks.task.create`
- `tasks.task.update`
- `tasks.task.assign`
- `tasks.task.close`
- `tasks.task.manage_subtree`

### Events

- `task.created`
- `task.assigned`
- `task.reassigned`
- `task.status.changed`
- `task.overdue`
- `task.completed`

### Done Criteria

- single canonical task model in code and DB
- assignment scope enforced by org subtree
- escalation scheduler covered by tests

## 8.8 Documents / EDM Module

This is the second major operational domain after incidents.

### Responsibilities

- document authoring
- registration and numbering
- routing and approval
- route templates
- document versions
- links to tasks, incidents, files
- journals, alerts, templates

### Core Entities

- `documents`
- `document_versions`
- `document_routes`
- `document_route_steps`
- `document_stage_actions`
- `document_registration_journal`
- `document_templates`
- `document_route_templates`
- `document_links`
- `document_alerts`
- `document_history`

### Required Features

- create incoming, outgoing, internal document
- register document
- upload and link version files
- launch route
- approve
- reject
- return for revision
- parallel approval stages
- save route template
- alert on overdue stages
- link document to incident or task

### Workflow

States:

- `draft`
- `registered`
- `in_route`
- `approved`
- `rejected`
- `returned_for_revision`
- `archived`

### API Groups

- `GET /documents`
- `GET /documents/:id`
- `POST /documents`
- `PATCH /documents/:id`
- `POST /documents/:id/register`
- `POST /documents/:id/route/start`
- `POST /documents/:id/route/approve`
- `POST /documents/:id/route/reject`
- `GET /documents/journal`
- `GET /documents/templates`

### Permissions

- `documents.doc.read`
- `documents.doc.create`
- `documents.doc.update`
- `documents.doc.register`
- `documents.route.read`
- `documents.route.manage`
- `documents.route.approve`
- `documents.template.manage`

### Events

- `document.created`
- `document.registered`
- `document.route.started`
- `document.stage.completed`
- `document.status.changed`
- `document.archived`

### Done Criteria

- no duplicate legacy EDM flow
- route rules centralized
- document versioning immutable

## 8.9 Notifications Module

### Responsibilities

- in-app notifications
- unread counters
- template rendering
- fan-out from domain events
- delivery audit

### Core Entities

- `notifications`
- `notification_templates`
- `notification_delivery_logs`
- `notification_preferences`

### Required Features

- create notification from event
- list notifications
- unread count
- mark read
- mark all read
- delivery logs
- channel preferences for future expansion

### API Groups

- `GET /notifications`
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

### Permissions

- `notifications.self.read`
- `notifications.self.update`
- `notifications.admin.read`

### Events

- `notification.created`
- `notification.read`

### Done Criteria

- key workflows emit notifications
- list and counters performant

## 8.10 Chat Module

### Responsibilities

- room creation
- membership
- persistent messages
- typing signals
- linked resource rooms
- attachment references

### Core Entities

- `chat_rooms`
- `chat_room_members`
- `chat_messages`
- `chat_message_attachments`
- `chat_read_receipts`

### Required Features

- direct chat
- org unit room
- incident room
- task room
- document room
- history loading
- read receipts
- typing indicator
- attachment linking

### API Groups

- `GET /chat/rooms`
- `POST /chat/rooms`
- `GET /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/members`

### Socket Events

- `chat:join`
- `chat:leave`
- `chat:message`
- `chat:history`
- `chat:typing`
- `chat:read`

### Permissions

- `chat.room.read`
- `chat.room.write`
- `chat.room.manage`

### Events

- `chat.room.created`
- `chat.message.sent`
- `chat.message.read`

### Done Criteria

- Redis adapter required for horizontal scaling
- room membership stored in DB
- linked resource room rules enforced

## 8.11 Communications Module

This covers calls and conferences metadata only. Media is external.

### Responsibilities

- call metadata
- conference room issuance
- provider integration
- participant tracking
- recording metadata

### Core Entities

- `calls`
- `call_participants`
- `conference_rooms`
- `conference_records`

### Required Features

- start one-to-one call
- start conference
- join by permissioned context
- save call metadata
- save recording metadata
- issue TURN credentials if WebRTC path is used
- integrate with Jitsi for conference room access

### API Groups

- `GET /calls`
- `GET /calls/:id`
- `POST /calls`
- `POST /calls/:id/end`
- `POST /conferences`
- `GET /calls/turn-credentials`

### Permissions

- `communications.call.read`
- `communications.call.start`
- `communications.conference.start`

### Events

- `call.started`
- `call.ended`
- `conference.created`
- `conference.recording.ready`

### Done Criteria

- provider choice fixed by ADR
- metadata stored in DB
- recordings linked through files module

## 8.12 Audit Module

### Responsibilities

- audit trail
- denials
- cross-module action feed
- compliance export

### Core Entities

- `audit_logs`
- `audit_export_jobs`

### Required Features

- store structured audit entries
- filter by actor, module, action, result, date
- export filtered audit set
- correlate resource history

### API Groups

- `GET /audit-logs`
- `POST /audit-logs/export`

### Permissions

- `audit.log.read`
- `audit.log.export`

### Events

- none externally required; this is a sink for actions

### Done Criteria

- every protected command logs to audit
- admin UI can filter large volumes efficiently

## 8.13 Outbox / Integration Module

### Responsibilities

- reliable event publication
- external sync
- delivery retries

### Core Entities

- `outbox_events`
- `integration_endpoints`
- `integration_delivery_attempts`

### Required Features

- transactional write with business command
- pending, processing, delivered, failed states
- exponential retry
- dead-letter visibility
- manual replay

### API Groups

- `GET /integrations/outbox`
- `POST /integrations/outbox/:id/replay`

### Permissions

- `integrations.outbox.read`
- `integrations.outbox.replay`

### Events

- this module publishes all domain events externally

### Done Criteria

- no direct analytics projection from request handlers
- outbox used by notifications and analytics sync

## 8.14 Analytics Module

This belongs to `analytics-api`, not `core-api`.

### Responsibilities

- analytical dashboards
- KPI registry and snapshots
- datasets and explorer
- reports
- analytical GIS, heatmaps, and choropleths
- forecasts

### Core Entities

- `anl_dim_time`
- `anl_dim_geography`
- `anl_dim_incident_type`
- `anl_dim_resource`
- `anl_dim_dataset`
- `anl_fact_incidents`
- `anl_fact_tasks`
- `anl_fact_documents`
- `anl_fact_communications`
- `anl_kpi_definitions`
- `anl_kpi_snapshots`
- `anl_geo_boundaries`
- `anl_geo_risk_zones`
- `anl_geo_event_layers`
- `anl_geo_infrastructure`
- `anl_geo_coverage_cells`
- `anl_dashboards`
- `anl_reports`
- `anl_pipeline_runs`
- `anl_raw_ingestion_log`

### Required Features

- incident trend dashboards
- response SLA dashboards
- document routing lag dashboards
- workload dashboards
- geo heatmaps
- choropleth maps by region
- time-slider map playback
- risk-zone overlays
- resource coverage overlays
- comparative maps by period
- exposure analysis by geography
- dataset explorer
- PDF and Excel exports
- scheduled KPI refresh
- forecasting job and output display

### Analytical GIS Rules

- analytical layers are derived, not editable source-of-truth objects
- executive map overlays come from `analytics-api`, not directly from operational tables
- operational and analytical layers may be shown together in frontend, but ownership remains separate
- analytical map tiles or aggregates may be cached aggressively; operational layers may not

### API Groups

- `GET /analytics/dashboards`
- `GET /analytics/datasets`
- `GET /analytics/explorer`
- `GET /analytics/kpi`
- `GET /analytics/reports`
- `GET /analytics/map/layers`
- `GET /analytics/map/heatmap`
- `GET /analytics/map/choropleth`
- `GET /analytics/map/timeseries`
- `POST /analytics/reports`
- `POST /analytics/pipeline/trigger`

### Permissions

- `analytics.dashboard.read`
- `analytics.dataset.read`
- `analytics.report.generate`
- `analytics.map.read`
- `analytics.pipeline.manage`

### Events Consumed

- `incident.*`
- `gis.feature.*`
- `task.*`
- `document.*`
- `call.*`
- `chat.message.sent` if communication metrics are needed

### Done Criteria

- service and DB separate from `core-api`
- data arrives only through outbox or approved ingestion jobs
- analytical access restricted to analysts and explicitly granted executives
- analytical GIS overlays are reproducible from pipeline runs and not hand-edited in production read models

## 9. Data Model Plan

## 9.1 Main Database

Main DB stores:

- IAM
- org hierarchy
- users
- incidents
- tasks
- documents
- files metadata
- chat metadata and messages
- call metadata
- notifications
- audit logs
- outbox events

Required table families:

- `users`, `sessions`, `role_permission_profiles`, `custom_user_permissions`
- `org_units`, `positions`, `delegations`, `user_org_assignments`
- `incidents`, `incident_events`, `incident_participants`, `incident_locations`
- `gis_layers`, `gis_features`, `gis_feature_geometries`, `gis_geofences`, `gis_saved_views`, `gis_import_jobs`
- `tasks`, `task_assignments`, `task_history`, `task_comments`
- `documents`, `document_versions`, `document_routes`, `document_route_steps`
- `files`, `file_versions`, `file_links`, `file_access_audit`
- `chat_rooms`, `chat_room_members`, `chat_messages`, `chat_read_receipts`
- `calls`, `call_participants`, `conference_rooms`, `conference_records`
- `notifications`
- `audit_logs`
- `outbox_events`

## 9.2 Analytics Database

Analytics DB stores:

- dimensions
- facts
- aggregated snapshots
- report metadata
- dashboard configs
- raw ingestion logs

It must not store:

- active user sessions
- write-side document workflows
- operational permission state

## 9.2.1 GIS Spatial Model

Write-side GIS rules:

- incident and GIS geometry live in PostGIS columns in `postgres-main`
- use GIST indexes on all frequently queried geometry columns
- keep topology-related validations in service layer and DB where practical
- use materialized or helper views for QGIS and heavy read paths, but do not move write ownership out of `core-api`

Recommended operational geometry fields:

- `incidents.location geometry(Point, 4326)` or `geometry(Geometry, 4326)` when area incidents are allowed
- `gis_features.geom geometry(Geometry, 4326)`
- `gis_geofences.geom geometry(Polygon, 4326)`

Recommended analytical geometry fields:

- `anl_geo_boundaries.boundary geometry(MultiPolygon, 4326)`
- `anl_geo_event_layers.geometry geometry(Geometry, 4326)`
- `anl_geo_coverage_cells.geom geometry(Polygon, 4326)`

## 9.3 Storage Strategy

- MinIO buckets by data class
- object key convention by module and date
- checksum mandatory
- versioning enabled for critical buckets

Suggested buckets:

- `documents`
- `attachments`
- `exports`
- `recordings`
- `templates`
- `backups` if operationally acceptable

## 10. Frontend Plan

## 10.1 Frontend Zones

The frontend is split into zones:

- auth
- workspace
- incidents
- tasks
- documents
- files
- communication
- analytics
- administration

## 10.2 Core Frontend Rules

- navigation built from permission and module flags
- route policies live in one manifest
- server and client state boundaries explicit
- typed API client generated or maintained from backend contract
- all forms have validation schemas matching backend DTOs
- every destructive command has confirmation and audit-friendly reason field when needed

## 10.3 Minimum Screens by Domain

Auth:

- sign in
- password change
- session recovery

Administration:

- users
- role matrix
- org tree
- delegations
- audit logs
- bulk import

Operations:

- incident list
- incident details
- operational GIS map
- GIS import and export jobs
- saved operational map views
- task list
- task board
- document inbox
- document route queue
- files browser

Communication:

- notifications center
- chat rooms
- call history

Analytics:

- executive overview
- operations KPI
- GIS analytics map
- region exposure map
- response coverage map
- temporal incident playback map
- dataset explorer
- reports

## 11. Event and Sync Plan

## 11.1 Mandatory Event Pattern

For every important business mutation:

1. write business data
2. write outbox event in same transaction
3. worker dispatches event
4. target consumer updates read model

## 11.2 Required Event Families

- `user.*`
- `org.*`
- `file.*`
- `incident.*`
- `task.*`
- `document.*`
- `notification.*`
- `call.*`
- `conference.*`

## 11.3 Analytics Sync Strategy

- near real-time queue-based projections every 1-5 minutes
- hourly aggregates
- nightly forecast jobs

No direct ad hoc SQL from frontend to operational DB for analytics use cases.

## 12. Infrastructure Plan

## 12.1 Docker Compose Baseline

Required compose services:

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

## 12.2 Configuration

- `.env.example` for each service
- centralized secret naming convention
- health endpoints for every runtime
- readiness and liveness checks for compose and future orchestration

## 12.3 Logging

Phase 1:

- structured JSON logs to stdout and file rotation at host level

Phase 2:

- Loki + Promtail if volume requires it

Mandatory log streams:

- `frontend`
- `core-api`
- `analytics-api`
- `worker`
- `nginx`
- `postgres`
- `redis`

## 12.4 Metrics

Mandatory metrics:

- CPU
- RAM
- disk
- API latency
- API 5xx rate
- DB connections
- replication lag if replicas exist
- Redis memory
- queue backlog
- MinIO health

## 12.5 Alerts

Minimum alert rules:

- API down
- analytics down
- worker down
- Postgres unavailable
- Redis unavailable
- MinIO unavailable
- queue backlog growth
- elevated 5xx
- high auth failure spike

## 12.6 GIS Infrastructure Requirements

- PostGIS enabled in `postgres-main`
- optional tile cache for heavy analytical layers
- base map provider decision documented
- if data sensitivity requires it, support self-hosted base maps or approved offline tile packs
- import worker capacity sized for Shapefile and GeoJSON ingestion jobs
- storage and retention policy for exported GIS datasets defined explicitly

## 13. Backup and Recovery Plan

## 13.1 PostgreSQL

Minimum:

- nightly full backup
- WAL archiving
- monthly restore drill

Preferred:

- primary + hot standby

## 13.2 MinIO

- nightly sync backup
- weekly integrity verification
- checksum validation for critical objects

## 13.3 Redis

- AOF enabled
- RDB snapshots enabled
- daily dump backup

## 13.4 Runbooks

Required runbooks:

- auth outage
- database outage
- MinIO outage
- Redis outage
- GIS import failure
- broken analytical map layer
- base map provider outage
- failed migration
- restore from backup
- analytics sync backlog

## 14. Security Plan

## 14.1 Backend Security

- JWT access + refresh rotation
- CSRF for cookie-sensitive endpoints
- rate limit by route class
- auth lockout
- strict DTO validation
- secure headers
- file content-type and size validation
- signed URLs only
- explicit permission decorators and policy layer

## 14.2 Frontend Security

- no module visibility based only on role name
- sensitive actions hidden and also blocked by backend
- token storage strategy documented and consistent
- content rendering sanitized where rich text exists

## 14.3 Audit Compliance

- all critical business actions logged
- delegation context preserved
- audit exports available to authorized staff

## 15. Testing Plan

## 15.1 Test Layers

- unit tests for domain services
- integration tests for repositories and policies
- e2e tests for critical workflows
- migration tests for up/down and blank DB bootstrap
- contract tests for frontend client bindings
- load tests for key list and auth endpoints

## 15.2 Must-Have E2E Suites

- auth hardening
- permission matrix allow/deny
- org subtree access
- delegation behavior
- file upload and download
- incident lifecycle
- GIS feature create, edit, delete
- GIS bbox and radius filtering
- GIS permission checks by org scope
- GIS import validation and publish flow
- incident-to-map linkage
- task assignment and reassignment
- document route approval
- notification counters
- analytics access restriction

## 15.3 CI Gates

- lint
- typecheck
- unit tests
- e2e smoke tests
- migration apply test
- build for all runtimes

No merge if schema changes lack migration or if new routes lack permission tests.

## 16. Delivery Phases

## Phase 0. Architecture Freeze

Deliverables:

- ADR pack approved
- domain map approved
- permission namespace approved
- canonical data model approved
- repo layout approved

Acceptance criteria:

- no open disagreement on service split
- no unresolved dual-model org design

## Phase 1. IAM and Org Foundation

Deliverables:

- auth
- sessions
- role matrix
- org units
- business roles
- delegations
- admin users CRUD

Acceptance criteria:

- admin can create user, assign org unit, assign roles, and revoke sessions

## Phase 2. Files Platform

Deliverables:

- MinIO integration
- metadata model
- upload/download
- audit
- file link model

Acceptance criteria:

- files module reusable by incidents, tasks, documents

## Phase 3. Incidents MVP

Deliverables:

- incident CRUD
- lifecycle
- severity
- participants
- incident timeline
- map placement
- point and polygon drawing
- operational GIS layers
- map filters and detail side panel
- bbox and radius queries

Acceptance criteria:

- incident can operate as primary work object
- duty officer can create and manage incidents directly from map workflow

## Phase 4. Tasks MVP

Deliverables:

- task CRUD
- assignment
- status workflow
- comments
- checklist
- escalation base

Acceptance criteria:

- tasks can be fully managed within scope rules

## Phase 5. Documents / EDM MVP

Deliverables:

- documents
- versions
- registration
- routes
- approvals
- templates

Acceptance criteria:

- one canonical document flow only

## Phase 6. Audit, Notifications, Outbox

Deliverables:

- unified audit
- notification center
- outbox events
- worker dispatch

Acceptance criteria:

- business events reliably flow to notifications and analytics

## Phase 7. Communications

Deliverables:

- chat rooms and messages
- call metadata
- Jitsi integration

Acceptance criteria:

- incident, task, and document contexts may have linked communication channels

## Phase 8. Analytics Service

Deliverables:

- separate analytics runtime
- separate analytics DB
- ingestion jobs
- dashboards
- KPI engine
- reports
- analytical GIS overlays
- heatmaps and choropleths
- time-based map playback

Acceptance criteria:

- no analytics logic required in `core-api` for dashboard rendering
- executive and analyst map overlays load from `analytics-api`

## Phase 9. GIS and Forecasting Expansion

Deliverables:

- analytical map layers
- heatmaps
- forecasting

Acceptance criteria:

- forecast outputs clearly labeled as derived and non-authoritative

## Phase 10. Ops and Rollout

Deliverables:

- compose baseline
- monitoring
- alerts
- backups
- restore drill
- pilot rollout

Acceptance criteria:

- go/no-go checklist passed

## 17. Definition of Done

A module is done only if all are true:

- entities and migrations exist
- permissions are defined
- ABAC policy exists if needed
- API contract exists
- backend tests exist
- frontend integration exists if user-facing
- audit behavior exists
- monitoring and logging impact considered
- docs updated

The platform is production-ready only if all are true:

1. core operational flows work without manual DB intervention
2. migrations fully represent schema
3. auth, files, incidents, tasks, documents have e2e coverage
4. analytics is separated into its own runtime and DB
5. monitoring, alerts, backup, and restore are operational
6. pilot rollout criteria are passed

## 18. Explicit Anti-Patterns To Avoid

- putting analytics entities into `core-api` write model
- keeping `department` and `org_unit` as long-term competing hierarchies
- building a second tasks module instead of evolving one canonical tasks domain
- shipping documents legacy and v2 in parallel without a migration cutoff date
- implementing frontend pages before permissions and workflow decisions
- using direct bucket links instead of presigned URLs
- mixing request-time business writes with analytics projections
- adding modules to the sidebar without backend authorization contracts

## 19. First 12 Weeks Suggested Schedule

Week 1:

- ADRs
- domain map
- repo layout
- environment baseline

Week 2:

- IAM auth
- role matrix
- auth audit

Week 3:

- org units
- business roles
- delegations

Week 4:

- users admin
- bulk import dry-run

Week 5:

- files module
- MinIO
- file links

Week 6:

- incidents CRUD
- severity and status workflow

Week 7:

- incident map
- participants
- timeline
- GIS layer management
- drawing and spatial filters

Week 8:

- tasks CRUD
- assignment
- comments

Week 9:

- documents CRUD
- registration
- versions

Week 10:

- routes
- approvals
- templates

Week 11:

- audit
- notifications
- outbox
- worker

Week 12:

- compose baseline
- monitoring
- pilot acceptance

## 20. Final Implementation Principle

If a decision improves delivery speed today but weakens domain clarity, ownership, or operational safety tomorrow, it must be rejected unless an ADR explicitly accepts the debt and defines:

- why the shortcut is necessary
- which module owns the debt
- how it will be removed
- by what date or phase it must be removed

This principle is what prevents the platform from drifting away from its intended architecture.
