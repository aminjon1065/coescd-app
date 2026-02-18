# Wave 1 Delivery Plan

Last updated: 2026-02-18
Duration: 2 weeks

## 1. Wave Objective
Deliver stable role-aware foundation:
- role dashboards
- staff management guardrails
- locked permission/scope behavior

## 2. Scope of Wave 1

### Backend
- finalize permission mapping for dashboard + staff actions
- implement `my-dashboard` endpoint by role
- enforce "department head can create users only in own department"
- extend audit logging for user lifecycle actions

### Frontend
- role-aware default dashboard widgets
- role-aware sidebar visibility
- staff screens with department-safe behavior
- robust 403 handling states

### QA
- role matrix e2e for admin/head/employee/analyst
- forbidden scope tests for staff and dashboard APIs

## 3. Delivery Breakdown (Day-by-Day)

### Days 1-2: Contracts and Matrix Lock
- approve `roles-permissions-matrix.md`
- define dashboard response contracts per role
- map frontend widgets to exact backend fields
Exit criteria:
- no open permission ambiguity
- API contract version tagged

### Days 3-5: Backend Implementation
- implement/adjust `GET /dashboard/my` (or equivalent)
- enforce department-head user create constraints
- add audit entries for create/update/role change/deactivate
- add tests for allow/deny scenarios
Exit criteria:
- backend build green
- new e2e tests green

### Days 6-8: Frontend Implementation
- role-based dashboard rendering
- role-aware route guards and sidebar
- staff forms constrained by role scope
- error/403 UX states
Exit criteria:
- frontend build green
- manual scenario pass for all target roles

### Days 9-10: Integration + Hardening
- end-to-end validation against real API
- fix contract drift
- finalize docs and release notes
Exit criteria:
- full e2e green
- demo-ready scenario set

## 4. Task List (Concrete)

### BE-1
Implement dashboard aggregation endpoint by role.
- Inputs: actor identity/role/scope
- Output: role-specific widget payload

### BE-2
Enforce staff scope rules.
- manager cannot create/update users outside own department
- manager cannot assign admin role

### BE-3
Audit enhancements.
- log actor, target, action, before/after role/dept, result

### FE-1
Dashboard role renderer.
- admin widgets
- department head widgets
- employee widgets
- analyst widgets

### FE-2
Staff management restrictions.
- hide forbidden controls
- backend-deny-safe behavior on submit

### FE-3
Navigation cleanup.
- role-based menu visibility
- route-level protection and fallback screens

### QA-1
E2E role suite.
- admin happy paths
- head scope-limited paths
- employee forbidden paths
- analyst extended paths

## 5. Dependencies
- `roles-permissions-matrix.md` must be approved before BE-2/FE-2 merge.
- dashboard API contract must be frozen before FE-1 implementation.

## 6. Risks and Mitigations
- Risk: permission ambiguity.
  - Mitigation: no implementation before matrix lock.
- Risk: frontend/backend drift.
  - Mitigation: contract fixtures + integration checkpoint on Day 9.
- Risk: hidden access bugs.
  - Mitigation: mandatory deny e2e cases per role.

## 7. Acceptance Criteria (Wave Complete)
- role dashboards available and correct by role
- staff management scope-safe for manager role
- audit logs include staff lifecycle actions
- 0 critical access violations in e2e
- docs updated and linked from master plan

## 8. Out of Scope for Wave 1
- chat/video implementation
- full GIS editing workflows
- AI predictions

