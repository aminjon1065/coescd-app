# EDM Schema v1

Last updated: 2026-02-18
Status: draft for implementation

## Goal

Define first implementation-ready DB schema for EDM context:
- document card
- route + stages
- stage actions (immutable)
- registration numbering
- delegation grants (IAM-linked)

## Storage

- PostgreSQL
- UTC timestamps
- `synchronize=false` (migration-only)

## Naming Convention

- tables: snake_case plural (`edm_documents`)
- primary key: `id` (`bigint` preferred for long-term growth)
- foreign keys: `<entity>_id`
- timestamps: `created_at`, `updated_at`

## Tables

## 1) `edm_documents`

Purpose:
- master document card and lifecycle status.

Columns:
- `id` bigint PK
- `external_number` varchar nullable (registry number visible to users)
- `type` varchar not null
- `status` varchar not null
- `title` varchar not null
- `subject` text nullable
- `summary` text nullable
- `resolution_text` text nullable
- `confidentiality` varchar not null default `public_internal`
- `department_id` bigint not null FK -> `departments.id`
- `creator_id` bigint not null FK -> `user.id`
- `current_route_id` bigint nullable FK -> `edm_document_routes.id`
- `due_at` timestamp nullable
- `approved_at` timestamp nullable
- `rejected_at` timestamp nullable
- `archived_at` timestamp nullable
- `deleted_at` timestamp nullable (soft delete)
- `created_at` timestamp not null default `now()`
- `updated_at` timestamp not null default `now()`

Constraints:
- `status` in (`draft`,`in_route`,`approved`,`rejected`,`returned_for_revision`,`archived`)
- `type` in (`incoming`,`outgoing`,`internal`,`order`,`resolution`)
- `confidentiality` in (`public_internal`,`department_confidential`,`restricted`)

Indexes:
- `IDX_EDM_DOC_STATUS_CREATED_AT` (`status`,`created_at`)
- `IDX_EDM_DOC_DEPARTMENT_STATUS` (`department_id`,`status`)
- `IDX_EDM_DOC_CREATOR_CREATED_AT` (`creator_id`,`created_at`)
- `IDX_EDM_DOC_EXTERNAL_NUMBER` (`external_number`) unique where not null

## 2) `edm_document_routes`

Purpose:
- route instance bound to one document version.

Columns:
- `id` bigint PK
- `document_id` bigint not null FK -> `edm_documents.id`
- `version_no` int not null
- `state` varchar not null
- `completion_policy` varchar not null default `sequential`
- `started_at` timestamp nullable
- `finished_at` timestamp nullable
- `created_by` bigint not null FK -> `user.id`
- `override_reason` text nullable
- `created_at` timestamp not null default `now()`

Constraints:
- `state` in (`active`,`completed`,`rejected`,`returned`,`cancelled`)
- `completion_policy` in (`sequential`,`parallel_all_of`,`parallel_any_of`)
- unique (`document_id`,`version_no`)

Indexes:
- `IDX_EDM_ROUTE_DOCUMENT_ID` (`document_id`)
- `IDX_EDM_ROUTE_STATE_CREATED_AT` (`state`,`created_at`)

## 3) `edm_route_stages`

Purpose:
- stage definitions inside route.

Columns:
- `id` bigint PK
- `route_id` bigint not null FK -> `edm_document_routes.id`
- `order_no` int not null
- `stage_group_no` int nullable
- `stage_type` varchar not null
- `assignee_type` varchar not null
- `assignee_user_id` bigint nullable FK -> `user.id`
- `assignee_role` varchar nullable
- `assignee_department_id` bigint nullable FK -> `departments.id`
- `state` varchar not null default `pending`
- `due_at` timestamp nullable
- `started_at` timestamp nullable
- `completed_at` timestamp nullable
- `escalation_policy` jsonb nullable
- `created_at` timestamp not null default `now()`

Constraints:
- `stage_type` in (`review`,`sign`,`approve`)
- `assignee_type` in (`user`,`role`,`department_head`)
- `state` in (`pending`,`in_progress`,`approved`,`rejected`,`returned`,`skipped`,`expired`)
- assignee consistency:
  - if `assignee_type='user'` then `assignee_user_id` not null
  - if `assignee_type='role'` then `assignee_role` not null
  - if `assignee_type='department_head'` then `assignee_department_id` not null

Indexes:
- `IDX_EDM_STAGE_ROUTE_ORDER` (`route_id`,`order_no`)
- `IDX_EDM_STAGE_ROUTE_STATE` (`route_id`,`state`)
- `IDX_EDM_STAGE_ASSIGNEE_USER_STATE` (`assignee_user_id`,`state`)

## 4) `edm_stage_actions`

Purpose:
- immutable action log for each stage.

Columns:
- `id` bigint PK
- `stage_id` bigint not null FK -> `edm_route_stages.id`
- `document_id` bigint not null FK -> `edm_documents.id`
- `action` varchar not null
- `action_result_state` varchar not null
- `actor_user_id` bigint not null FK -> `user.id`
- `on_behalf_of_user_id` bigint nullable FK -> `user.id`
- `comment_text` text nullable
- `reason_code` varchar nullable
- `ip` varchar nullable
- `user_agent` varchar nullable
- `created_at` timestamp not null default `now()`

Constraints:
- `action` in (`approved`,`rejected`,`returned_for_revision`,`commented`,`override_approved`,`override_rejected`)
- `action_result_state` in (`approved`,`rejected`,`returned`,`commented`)

Indexes:
- `IDX_EDM_ACTION_STAGE_CREATED_AT` (`stage_id`,`created_at`)
- `IDX_EDM_ACTION_DOCUMENT_CREATED_AT` (`document_id`,`created_at`)
- `IDX_EDM_ACTION_ACTOR_CREATED_AT` (`actor_user_id`,`created_at`)

## 4.1) `edm_document_timeline_events`

Purpose:
- unified immutable history of document movement and responsibility.

Columns:
- `id` bigint PK
- `document_id` bigint not null FK -> `edm_documents.id`
- `event_type` varchar not null
- `actor_user_id` bigint not null FK -> `user.id`
- `from_user_id` bigint nullable FK -> `user.id`
- `to_user_id` bigint nullable FK -> `user.id`
- `from_role` varchar nullable
- `to_role` varchar nullable
- `responsible_user_id` bigint nullable FK -> `user.id`
- `parent_event_id` bigint nullable FK -> `edm_document_timeline_events.id`
- `thread_id` varchar nullable
- `comment_text` text nullable
- `meta` jsonb nullable
- `created_at` timestamp not null default `now()`

Constraints:
- `event_type` in (
  `created`,
  `forwarded`,
  `responsible_assigned`,
  `responsible_reassigned`,
  `reply_sent`,
  `route_action`,
  `override`,
  `archived`
)

Indexes:
- `IDX_EDM_TIMELINE_DOCUMENT_CREATED_AT` (`document_id`,`created_at`)
- `IDX_EDM_TIMELINE_THREAD_CREATED_AT` (`thread_id`,`created_at`)
- `IDX_EDM_TIMELINE_EVENT_TYPE_CREATED_AT` (`event_type`,`created_at`)

## 4.2) `edm_document_replies`

Purpose:
- correspondence thread records linked to document timeline.

Columns:
- `id` bigint PK
- `document_id` bigint not null FK -> `edm_documents.id`
- `timeline_event_id` bigint not null FK -> `edm_document_timeline_events.id`
- `sender_user_id` bigint not null FK -> `user.id`
- `parent_reply_id` bigint nullable FK -> `edm_document_replies.id`
- `thread_id` varchar not null
- `message_text` text not null
- `created_at` timestamp not null default `now()`

Indexes:
- `IDX_EDM_REPLY_DOCUMENT_CREATED_AT` (`document_id`,`created_at`)
- `IDX_EDM_REPLY_THREAD_CREATED_AT` (`thread_id`,`created_at`)

## 5) `edm_document_registry_sequences`

Purpose:
- deterministic numbering by scope key.

Columns:
- `id` bigint PK
- `department_id` bigint not null FK -> `departments.id`
- `doc_type` varchar not null
- `year` int not null
- `last_value` int not null default 0
- `updated_at` timestamp not null default `now()`

Constraints:
- unique (`department_id`,`doc_type`,`year`)

Indexes:
- `IDX_EDM_REGISTRY_SCOPE` (`department_id`,`doc_type`,`year`) unique

## 6) `iam_delegations` (shared IAM table used by EDM)

Purpose:
- temporary delegated authority.

Columns:
- `id` bigint PK
- `delegator_user_id` bigint not null FK -> `user.id`
- `delegate_user_id` bigint not null FK -> `user.id`
- `scope_type` varchar not null
- `scope_department_id` bigint nullable FK -> `departments.id`
- `permission_subset` jsonb not null
- `valid_from` timestamp not null
- `valid_to` timestamp not null
- `status` varchar not null
- `created_by` bigint not null FK -> `user.id`
- `created_at` timestamp not null default `now()`

Constraints:
- `scope_type` in (`department`,`global`)
- `status` in (`active`,`revoked`,`expired`)
- `valid_from < valid_to`
- `delegator_user_id != delegate_user_id`

Indexes:
- `IDX_DELEGATION_DELEGATE_VALIDITY` (`delegate_user_id`,`valid_from`,`valid_to`,`status`)
- `IDX_DELEGATION_DELEGATOR_VALIDITY` (`delegator_user_id`,`valid_from`,`valid_to`,`status`)

## Link Tables (cross-context)

Use existing `file_links` with `resource_type='document'`.

Optional v1.1:
- `edm_document_task_links` (`document_id`,`task_id`)
- `edm_document_incident_links` (`document_id`,`incident_id`)

## Check Constraints (recommended)

- forbid direct update of `edm_stage_actions` rows in app service layer.
- forbid transition from terminal states except explicit route version restart.

## Partitioning (defer)

Not in v1.
Consider partitioning `edm_stage_actions` by month when row count > 20M.

## Migration Plan (order)

1. create `iam_delegations`
2. create `edm_documents`
3. create `edm_document_routes`
4. add `edm_documents.current_route_id` FK (after route table exists)
5. create `edm_route_stages`
6. create `edm_stage_actions`
7. create `edm_document_timeline_events`
8. create `edm_document_replies`
9. create `edm_document_registry_sequences`
10. create indexes and check constraints

## Rollback Strategy

- down migration drops EDM tables in reverse dependency order.
- never drop shared IAM tables in destructive rollback on prod; mark deprecated via follow-up migration.

## Data Integrity Rules (application layer)

- route version increments on restart after `returned_for_revision` if policy says new version.
- number assignment is single-transaction sequence increment + document update.
- delegation lookup resolved at command time, not cached beyond request.

## Acceptance Criteria

1. Schema supports all states and transitions in `edm-functional-spec-v1`.
2. Stage assignee constraints prevent invalid assignee combinations.
3. Numbering uniqueness guaranteed by DB constraint.
4. All action/audit rows are append-only from API perspective.
5. Query indexes cover inbox/outbox/status/date filters.
6. Timeline can reconstruct full movement chain and reply thread for any document.
