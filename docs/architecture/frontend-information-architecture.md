# Frontend Information Architecture (Wave 1)

Last updated: 2026-02-18

## 1. Goal
Define clear screen hierarchy and role-based navigation to avoid feature chaos.

## 2. Top-Level Navigation
All authenticated users enter `/dashboard`.

Primary sections:
- `Dashboard` (role-aware home)
- `EDM` (documentation)
- `Files`
- `Tasks`
- `Staff`
- `Chat` (Wave 3)
- `Video` (Wave 3)
- `Disaster` (read-only for most users)
- `GIS` (analyst-focused)
- `Admin/Ops` (admin only)

## 3. Role-Based Home Dashboards

### 3.1 Admin Home
Route: `/dashboard`
Widgets:
- system health summary
- auth failure alerts
- overdue EDM stages (global)
- workload by department
- user/department changes (audit feed)
Quick actions:
- create department
- create manager
- open ops metrics

### 3.2 DepartmentHead Home
Route: `/dashboard`
Widgets:
- department overdue tasks
- department EDM in-route queue
- subordinate workload
- staff changes in department
Quick actions:
- create department user
- open approvals queue

### 3.3 Employee Home
Route: `/dashboard`
Widgets:
- my tasks
- my approvals queue
- my unread EDM alerts
- recent documents
Quick actions:
- open incoming journal
- upload file

### 3.4 Analyst Home
Route: `/dashboard`
Widgets:
- everything from Employee baseline
- published disaster stats
- data quality warnings
- GIS layer activity
Quick actions:
- open disaster data workspace
- open GIS workspace

## 4. EDM Workspace IA
Routes:
- `/dashboard/documentation` -> incoming journal
- `/dashboard/documentation/sent` -> outgoing journal
- `/dashboard/documentation/internal` -> internal journal
- `/dashboard/documentation/[id]` -> document card

Screen model:
1. Journal page
- KPI cards (draft/in_route/approved/archive)
- filters (q, status, type, date range)
- table list
- pagination
- action: create document

2. Document card page
- main metadata (number, type, status, confidentiality)
- subject/summary/resolution
- route block (stages and states)
- actions block (archive and other allowed actions)

## 5. Files Workspace IA (Wave 2 target)
Route: `/dashboard/files`
Tabs:
- my files
- shared with me
- linked to documents
Panels:
- ACL/share panel
- audit events panel

## 6. Staff Workspace IA (Wave 1 target)
Route: `/dashboard/users`
Views:
- users table
- create/edit user dialog
- filters (department, role, active)
Role behavior:
- admin sees global dataset
- department head sees only own department users
- create user form for department head has fixed department

## 7. Access UX Rules
- Never rely on hidden buttons only.
- On `403`, show clear scope/access message and safe fallback action.
- Keep page usable when optional blocks are forbidden.

## 8. UI Consistency Rules
- All list pages: same filter row pattern and pagination placement.
- All status fields: shared badge styles.
- All destructive actions: confirm dialog.
- All async actions: loading, success, error feedback.

## 9. Technical Rules
- Use typed interfaces per domain (`IEdmDocument`, `IFile`, etc).
- Keep API calls in domain-oriented hooks/services (incremental refactor allowed).
- One screen should not call unrelated domains unless explicitly justified.

## 10. Wave 1 Required Deliverables
- role-aware dashboard home
- staff scope-safe management screens
- stabilized EDM journal/card UX
- updated sidebar navigation by role

