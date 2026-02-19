# EDM Functional Spec v1

Last updated: 2026-02-19
Status: implementation-aligned (business target preserved)

## Purpose

Define business behavior of EDM (Electronic Document Manager) and align it with current implementation baseline.

Scope of this spec:
- document lifecycle and route engine
- signing/approval/review stages
- delegation behavior and authority rules
- registration/numbering principles
- audit and compliance requirements

Out of scope:
- UI pixel design
- OCR/full-text search internals
- external interop protocols (can be added in v2)

Implementation baseline for this sprint:
- `docs/role-permissions-lock-2026-02-19.md`
- `docs/architecture/edm-api-contract-v1.md`
- `backend/src/edm/edm.controller.ts`

## Actors

Target business actors:
- Chairperson
- Deputy Chairperson
- Department Head
- Department Deputy
- Regular Operator
- System Admin (technical admin, not business approver by default)

Current backend role mapping (active now):
- `admin` -> System Admin (+ policy-based global business actions where granted)
- `manager` -> Department Head profile
- `regular` -> Regular Operator profile
- analyst/profile extensions are handled via custom permissions, not separate EDM role enum value

## Core Entities

1. Document Card
- metadata: title, type, department, creator, confidentiality, due date
- business fields: subject, summary, resolution text
- relations: files, route, linked tasks/incidents

2. Route
- ordered set of stages
- mode: sequential or stage-group parallel
- route owner: creator or chairperson override

3. Stage
- stage type: `review`, `sign`, `approve`
- assignee selector: concrete user / role / department head
- deadline and escalation policy

4. Stage Action
- action: `approved`, `rejected`, `returned_for_revision`, `commented`
- immutable audit record

5. Delegation Grant
- temporary authority transfer for scope + permission subset

6. Document Timeline Event
- immutable timeline event for every movement/action:
  - created
  - forwarded (from -> to)
  - assigned responsible executor
  - reply sent
  - route action / override / archive

7. Correspondence Reply
- reply/response linked to document trail
- supports chain (`parentReplyId`) for threaded conversation

## Document Types

`incoming`, `outgoing`, `internal`, `order`, `resolution`

Type affects:
- default route template
- mandatory fields
- registry number sequence

## Lifecycle

States:
- `draft`
- `in_route`
- `approved`
- `rejected`
- `returned_for_revision`
- `archived`

Transitions:
- `draft -> in_route`
- `in_route -> approved`
- `in_route -> rejected`
- `in_route -> returned_for_revision`
- `returned_for_revision -> in_route`
- `approved -> archived`

Rules:
- once `approved/rejected`, card body is read-only (except archival metadata)
- editing in `in_route` requires route restart unless policy allows minor edits

## Route Execution Rules

1. Sequential stages
- next stage opens only after previous stage terminal action.

2. Parallel stage group
- completion policy configurable:
  - `all_of` (all assignees must approve)
  - `any_of` (one approval is enough)

3. Rejection behavior
- stage reject can either:
  - close route as `rejected`, or
  - return to author as `returned_for_revision` (template-configured)

4. Return for revision
- only author/editor can resubmit to route
- previous stage actions remain immutable history

5. Emergency override
- chairperson can inject emergency stage and/or force close with mandatory reason

## Delegation Semantics

Delegation applies when all true:
- current time in `[validFrom, validTo]`
- permission requested belongs to delegation subset
- resource scope matches delegation scope

Behavior:
- delegate acts on stage as delegated authority
- audit stores both principal actors:
  - `actorUserId` (delegate who clicked)
  - `onBehalfOfUserId` (delegator)

Constraints:
- delegation cannot expand scope beyond delegator's own effective scope
- nested delegation forbidden in v1

## Authority Matrix (business level)

1. Chairperson
- can create/approve/sign all routes globally
- can override any route with reason

2. Deputy Chairperson
- same only if role grant includes global EDM permissions or active delegation

3. Department Head
- can create routes in own department
- can assign stages to department users
- can sign/approve within department scope

4. Department Deputy
- same department scope; additional powers only when delegated

5. Regular Operator
- can create drafts (if allowed)
- can execute assigned stage actions only

## Numbering/Registration

Registration occurs when document reaches configured milestone (default: first send to route).

Number format (example):
- `{DEPT_CODE}-{DOC_TYPE}-{YYYY}-{SEQ}`

Rules:
- sequence uniqueness by (`department`, `doc_type`, `year`)
- sequence gaps allowed but must be audited
- manual override forbidden in v1 except chairperson emergency mode

## Deadlines and Escalation

Per stage:
- `dueAt`
- escalation chain (assignee -> manager -> chair/deputy depending template)

Events:
- `stage.overdue`
- `route.overdue`

Actions:
- notification + analytics counters
- no auto-approval in v1

## Confidentiality

Levels:
- `public_internal`
- `department_confidential`
- `restricted`

Access rules:
- base scope checks + confidentiality checks
- `restricted` requires explicit participant relation or elevated global authority

## Audit Requirements

Must audit:
- document creation/update/delete (logical)
- route creation and every stage action
- delegation-based actions with on-behalf context
- override operations
- number assignment and any exceptional renumbering
- every forwarding hop (`fromUserId`, `toUserId`, `fromRole`, `toRole`)
- every responsible assignment change
- every reply and reply-to-reply event

Audit payload minimum:
- actor, role snapshot, delegation context
- resource id/type
- action, before/after status
- ip, user agent, timestamp, reason
- timeline linkage:
  - `timelineEventId`
  - `parentEventId` (nullable)
  - `threadId` (for correspondence chain)

## Document History And Correspondence Trail

Mandatory timeline must answer:
1. who created the document
2. to whom it was sent at each step (full hop chain)
3. who became responsible for execution and when
4. what replies were sent and in response to which message/event

Rules:
- timeline is append-only
- no hard delete for timeline/reply records
- each reply is linked to:
  - document
  - sender
  - recipient(s)
  - optional parent reply
  - created timestamp
- UI timeline must render movement + replies in chronological order

## API Surface (v1 target + implemented baseline)

Core lifecycle commands:
- create draft
- update draft
- submit to route
- execute stage action
- return for revision
- archive
- attach/detach file

Core lifecycle queries:
- inbox/outbox/my-approval queues
- route detail with stages
- audit timeline for document
- search by number/type/status/date/department

Implemented extensions in current baseline:
- document templates CRUD
- route templates CRUD
- registration operations and registration journal
- document resolution tasks + task progress
- alerts processing/list/acknowledge
- saved filters CRUD
- EDM reports and dashboard summary exports

## Integration Requirements

With Files:
- EDM stores links, Files stores binaries and access audit.

With Tasks:
- optional link document <-> task.

With GIS/Analytics:
- emit events for projections and dashboard KPIs.

## Non-Functional Targets

- list endpoints paginated, P95 < 300ms at pilot load
- all state transitions idempotent for retry-safe operations
- immutable audit trail for regulatory review

## Open Decisions (business target track)

1. Should `returned_for_revision` keep old route id or create new route version?
2. Should department deputy have default sign rights without delegation?
3. Which document types require mandatory parallel approval?
4. Is manual registration number override ever allowed in production?
5. What is retention policy per confidentiality level?

Current implementation note:
- these decisions remain target-level decisions and do not block the current sprint lock with roles `admin/manager/regular`.

## Acceptance Criteria (for EDM v1 implementation)

1. Route engine enforces stage order/parallel policy correctly.
2. Delegation actions are validated and audited with on-behalf metadata.
3. Numbering is unique and reproducible by scope key.
4. Lifecycle transitions are strict and cannot be bypassed via API.
5. Full document timeline (actions + route + file links) is queryable.
