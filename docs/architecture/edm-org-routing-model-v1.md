# EDM Org Routing Model v1

Last updated: 2026-02-19
Status: proposed baseline for implementation

## 1. Goal

Formalize real committee hierarchy and document routing rules for EDM.

## 2. Business Roles

1. `chairperson` (Председатель)
2. `first_deputy` (Первый заместитель)
3. `deputy` (Заместитель)
4. `department_head` (Начальник департамента)
5. `division_head` (Начальник подразделения)
6. `chancellery` (Канцелярия / Общий отдел)
7. `employee` (исполнитель/сотрудник, опционально на этапе исполнения)

Notes:
- `first_deputy` and `deputy` have equal routing rights.
- `chancellery` is both operational sender and global registry/search role.

## 3. Hierarchy Model

- Committee level: `chairperson`, `first_deputy`, `deputy`, `chancellery`
- Department level: `department_head`
- Division level: `division_head`
- Execution level: `employee`

## 4. Routing Rights (Who Can Send To Whom)

## 4.1 Chairperson
- can send to: `first_deputy`, `deputy`, `department_head`, `division_head`, `chancellery`

## 4.2 First Deputy / Deputy
- can send to: `chairperson`, `first_deputy`, `deputy`, `department_head`, `division_head`, `chancellery`

## 4.3 Department Head
- can send to:
  - own `division_head` and own `employee`
  - other `department_head` (cross-department direct routing allowed)
  - `chancellery`

## 4.4 Division Head
- can send to:
  - own `department_head` (upward)
  - peer `division_head` in same department
  - own `employee`
  - `chancellery`

## 4.5 Chancellery
- can send to all roles for official registration/distribution workflows
- has global read/search/report visibility across all documents

## 5. Forwarding Rule

- Recipient can forward document without sender approval.
- Level skipping is allowed (example: deputy -> division_head directly).
- UI should prefer showing parent chain (department head + division heads), but final choice belongs to sender.
- Every forwarding step must be written to immutable timeline history.

## 6. Override Rule

Allowed override actors:
- `chairperson`
- `first_deputy`
- `deputy`
- `department_head` (only for documents created by self or started in own department scope)
- `chancellery` (operational exception handling, with mandatory reason)

Override actions:
- force approve
- force reject
- force close route

Mandatory constraints:
- override always requires `reason`
- audit must store actor, role, document, previous state, new state, reason, timestamp, ip/user-agent

## 7. Route Types (Recommended)

For MVP keep two route types:

1. `free`
- sender manually selects next recipients within allowed matrix
- supports fast operational work

2. `controlled`
- route templates with required stages (for regulated document classes)
- optional parallel stage groups

Parallel policy:
- support both `all_of` and `any_of` at stage-group level
- example: one document to two deputies in parallel, then each can forward to execution owners

## 7.1 Mandatory History Trail

For each document system must keep:
1. creation event
2. full forwarding chain (`who -> whom`)
3. responsible executor assignments/reassignments
4. replies and reply-to-reply links

This trail is mandatory for:
- operational tracking
- accountability
- report/export evidence

## 8. Minimum Permission Names (Target)

- `edm.document.create`
- `edm.document.read`
- `edm.document.update`
- `edm.route.forward`
- `edm.route.override`
- `edm.route.template.read`
- `edm.route.template.write`
- `edm.registry.read`
- `edm.registry.write`
- `edm.chancellery.global_read`
- `edm.reports.read`

## 9. Backend Transition Note

Current backend roles are `admin`, `manager`, `regular`.
This org model is a target role model and should be introduced in phases:

1. Add new role enum values and migration for user role mapping.
2. Introduce routing policy matrix (`sender_role` -> `receiver_role`) in config/table.
3. Replace hardcoded department-only assumptions in EDM policy checks.
4. Extend e2e matrix for all new roles.
