# Implementation Plan

Last updated: 2026-02-18

This plan defines the path from current core MVP to production rollout for:
- 1 central admin user
- 200+ operators across multiple departments
- role/permission model with RBAC + ABAC scopes

## Objectives

Primary objectives:
- Make current core stable and operationally safe for production.
- Deliver complete user-facing flows for features listed in README.
- Ensure one admin can manage 200+ users without manual bottlenecks.

Out of scope for this plan:
- Full microservice split.
- Multi-region deployment and disaster-recovery architecture.

## Release Strategy

Rollout waves:
1. Wave 0: admin-only validation environment.
2. Wave 1: pilot for 20-30 users in 2-3 departments.
3. Wave 2: full rollout to 200+ users.

Each wave has go/no-go criteria:
- no critical auth/access bugs
- successful migration run and rollback check
- backup/restore check completed
- monitoring and alerting enabled

## Work Phases

## Phase 0: Scope Freeze And Planning (3-5 days)

Deliverables:
- Confirm core release scope and defer non-core features.
- Align README status with real implementation state.
- Validate role model for all department types.
- Define pilot departments and acceptance criteria.

Acceptance criteria:
- Signed feature list for release.
- Signed permission matrix for admin and operator roles.
- Signed launch checklist with wave owners.

## Phase 1: Core Hardening (1-2 weeks)

Deliverables:
- Full migration coverage audit for current schema.
- Legacy unit test stabilization (`npm test` green baseline).
- API list endpoints normalized with pagination/filter/sort.
- DB index review for high-volume paths:
  - users, tasks, documents, files, audit logs

Acceptance criteria:
- No unmanaged schema drift.
- CI green for unit + e2e critical suite.
- P95 response time targets met on list endpoints under load test.

## Phase 2: IAM And Admin Scale (1-2 weeks)

Deliverables:
- Role templates by department profile.
- Bulk user lifecycle operations:
  - CSV import
  - dry-run validation with error report
  - idempotent upsert mode
- Admin UI improvements:
  - bulk assignment of role/department
  - account activation/deactivation in batches
- Extended audit trail for admin bulk actions.

Acceptance criteria:
- Admin can onboard 200 users in one controlled batch process.
- Permission assignment can be done by templates, not per-user editing.
- All bulk operations are auditable and reversible where applicable.

## Phase 3: User Features Completion (2 weeks)

Deliverables:
- GIS user flow:
  - incident create/edit
  - filtering by status/severity/department
  - map + side-panel incident details
- Files user flow:
  - upload/download/list/delete
  - attachment linking for tasks/documents
  - clear quota/limit errors in UI
- Analytics user flow:
  - operational dashboards for incidents/tasks/users
  - filters and drill-down lists
- Prediction MVP:
  - minimal backend endpoint
  - frontend block in analytics page

Acceptance criteria:
- Product owners can execute end-to-end daily workflows from UI only.
- No mandatory manual DB changes for regular operations.

## Phase 4: Operations And Reliability (1-2 weeks)

Deliverables:
- Production runtime baseline (`compose` or deployment manifests).
- Monitoring and alerting:
  - API error rate
  - auth failure spikes
  - DB latency and saturation
  - Redis health
- Backup/restore runbook with test evidence.
- Incident runbook for auth/files/database outages.

Acceptance criteria:
- Restore drill completed successfully.
- Alert thresholds tuned and verified.
- On-call runbook approved by team.

## Phase 5: Controlled Rollout (1 week + stabilization)

Deliverables:
- Wave 0 checklist execution (admin-only).
- Wave 1 pilot onboarding and feedback loop.
- Wave 2 full rollout execution.
- 1-2 weeks post-launch stabilization window.

Acceptance criteria:
- No Sev-1 unresolved incidents after full rollout.
- Support backlog stable and within agreed SLA.

## Backlog Priorities (Now)

Priority 1:
- Migration coverage audit and missing migrations.
- Unit test stabilization for legacy specs.
- Bulk user import (CSV + dry-run + report).

Priority 2:
- GIS CRUD completion in frontend/backed integration.
- Files UX completion (attachments + errors + limits).
- Analytics completion for operational visibility.

Priority 3:
- Prediction MVP.
- Chat/Calls design and phased implementation after core release.

## Nearest Sprint Plan (10 working days)

Week 1:
1. Migration audit report and remediation list.
2. Fix highest-impact failing unit tests.
3. Add/validate pagination and indexes for heavy endpoints.
4. Define CSV schema for bulk user import.

Week 2:
1. Implement backend import service with dry-run.
2. Implement admin UI for bulk onboarding.
3. Implement audit events for bulk operations.
4. Run pilot data rehearsal for 200-user batch.

Expected sprint output:
- production-ready user onboarding path for 200+ accounts
- reduced operational risk before user-facing feature expansion

## Definition Of Done For "Core Ready"

Core is considered ready when all are true:
1. Critical user flows pass e2e and UAT without manual workarounds.
2. Unit and e2e pipelines are green and stable.
3. Database migrations fully represent active schema.
4. Monitoring, alerting, backup, and restore are operational.
5. Admin can manage user lifecycle at 200+ scale through supported UI/API flows.

