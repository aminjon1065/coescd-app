# Phase 1 Backlog: Core Hardening

Date: 2026-02-18
Phase window: 1-2 weeks

## Sprint Goal

Bring core to stable production baseline before scale onboarding:
- migration safety
- test stability
- query performance on key lists
- readiness for 200+ users

## Baseline Status

From `npm test` on 2026-02-18:
- Test suites: 21 failed, 6 passed, 27 total.
- Main failure classes:
  - outdated unit specs without required DI mocks
  - guard/storage specs instantiating classes with missing constructor args
  - JWT-related spec runtime error in auth tests

Related audit:
- `docs/migration-coverage-audit-2026-02-18.md`

## Progress Update (2026-02-18)

Completed:
- `CORE-001` explicit core baseline migration
- `CORE-002` removed implicit synchronize bootstrap behavior
- `CORE-003` legacy unit tests stabilization pack A
- `CORE-004` legacy unit tests stabilization pack B
- `CORE-006` CI pipeline hardening (`build -> smoke -> unit -> e2e`)
- `CORE-007` observability minimum (`/api/ops/metrics`, API latency/error metrics, auth failure spike alert signal)
- `CORE-008` bulk onboarding design spec (`docs/bulk-user-import-spec.md`)
- `CORE-008` backend implementation (`/users/bulk-import/dry-run`, `/users/bulk-import/apply`, idempotent apply, per-user audit logs)
- `CORE-008` storage hardening (preview/idempotency moved to Redis with in-memory fallback when `REDIS_DISABLED=true`)
- `CORE-008` operation-level audit (`bulk_import_operations` table + dry-run/apply metadata logging)

## Tickets

## P0 (Must Complete)

1. `CORE-001` Migration coverage completion
- Scope:
  - convert uncovered core tables into explicit baseline migration set
  - verify deterministic up/revert sequence
- Deliverables:
  - new migration files
  - migration runbook update
- Estimate: 2 days
- Owner: Backend
- Dependencies: none

2. `CORE-002` Remove bootstrap schema ambiguity
- Scope:
  - deprecate implicit `synchronize` bootstrap behavior for production paths
  - keep safe strategy for local/dev bootstrap documented
- Deliverables:
  - migration/bootstrap policy documented and implemented
- Estimate: 0.5 day
- Owner: Backend
- Dependencies: CORE-001

3. `CORE-003` Legacy unit tests stabilization pack A
- Scope:
  - fix controller/service specs with missing repository/provider mocks:
    - users, departments, tasks
    - analytics controllers/services
- Deliverables:
  - green tests for targeted modules
- Estimate: 2 days
- Owner: Backend
- Dependencies: none

4. `CORE-004` Legacy unit tests stabilization pack B
- Scope:
  - fix auth/guard/storage/hash specs:
    - constructor args
    - JWT-related test environment errors
- Deliverables:
  - green IAM spec group
- Estimate: 1.5 days
- Owner: Backend
- Dependencies: none

5. `CORE-005` Critical list endpoint pagination and index pass
- Scope:
  - standardize pagination/filter/sort for heavy endpoints
  - add missing DB indexes for users/tasks/documents/disasters/audit lists
- Deliverables:
  - endpoint updates
  - migration with indexes
- Estimate: 2 days
- Owner: Backend
- Dependencies: CORE-001

## P1 (Should Complete)

1. `CORE-006` Test pipeline hardening
- Scope:
  - split test commands:
    - smoke unit set
    - full unit set
    - e2e set
  - add CI job order and failure gates
- Deliverables:
  - updated scripts and CI config
- Estimate: 1 day
- Owner: Backend/DevOps
- Dependencies: CORE-003, CORE-004

2. `CORE-007` Phase 1 observability minimum
- Scope:
  - baseline API error and latency metrics
  - alert for auth failure spike
- Deliverables:
  - metrics/alerts config draft
- Estimate: 1 day
- Owner: DevOps
- Dependencies: none

## P2 (Can Start In Parallel)

1. `CORE-008` Admin bulk user import design spec
- Scope:
  - CSV format, validation rules, dry-run response format
  - role template mapping rules by department
- Deliverables:
  - approved technical spec for Phase 2 implementation
- Estimate: 1 day
- Owner: Backend + Product
- Dependencies: none

## Definition Of Done (Phase 1)

Phase 1 is complete when:
1. Migrations are explicit and reproducible on empty and existing DB paths.
2. `npm test` is green or reduced to an agreed, tracked and temporary allowlist.
3. Heavy list endpoints have stable pagination/filter/sort and required indexes.
4. Core CI gates for tests and migration checks are active.

## Execution Order

Recommended sequence:
1. CORE-001
2. CORE-002
3. CORE-003 and CORE-004 in parallel
4. CORE-005
5. CORE-006 and CORE-007
6. CORE-008
