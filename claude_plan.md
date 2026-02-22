CoESCD App — Code Review & Production Roadmap
Code Review Summary
Strengths
Solid architecture: Modular NestJS backend, clean separation of concerns, DDD-style modules
Security-first design: JWT + CSRF + rate limiting + bcrypt + HTTP-only cookies + audit logs
Sophisticated RBAC/ABAC: 11 roles, 38 permissions, scope-based filtering (global/department/subtree/self)
Enterprise EDM: 17-entity document workflow engine with routing, delegation, approvals, registration journals
Modern frontend: Next.js 15 App Router, React 19, Tailwind 4, Radix UI, proper token refresh handling
Audit trails: Auth events, user changes, file access — all logged
TypeScript full-stack: Well-typed DTOs, entities, permission constants
Enterprise seed: EnterpriseIamSeed correctly uses upsert logic with change detection
Risk Areas Identified
Test stability — legacy unit tests have DI mock mismatches; npm test not reliably green
Migration draft — 1771771020271-AutoMigration.ts in drafts/ is uncommitted/unreviewed schema drift
GIS/Chat/WebRTC — gis.read, gis.write, chat.read permissions exist in permissions.ts + zones but modules are placeholders only
Analytics module — backend "prediction placeholder" is not implemented; frontend analytics page exists
Dual department models — Department entity and OrgUnit entity serve overlapping purposes (both seeded with same structure); this is a latent complexity risk
COMMUNICATION zone — chat.read permission and zone exist in zones.ts but no chat module exists in backend at all
No input validation audit — bulk CSV import and presigned upload flows need a review pass for security edge cases
Production Roadmap
Phase 0 — Scope Freeze & Baseline Stabilization (Now, ~3–5 days)
Goal: Get the codebase to a clean, auditable baseline before adding any features.

Task	Details
Audit migration draft	Review drafts/1771771020271-AutoMigration.ts, promote or discard it
Run migration coverage check	Diff active schema vs all migration files; identify any untracked columns
Stabilize npm test	Fix DI mock issues in legacy unit test specs; target green CI
Align README with reality	Mark GIS/Chat/WebRTC as "planned", not "available"
Document the Department vs OrgUnit duality	Clarify which is the canonical routing source for EDM
Phase 1 — Core Hardening (1–2 weeks)
Goal: API reliability, query performance, and a stable CI pipeline.

Task	Details
Normalize list endpoints	Ensure all GET /api/* lists support page, limit, sort, filter; return { data, total, page }
DB index audit	Review indexes on tasks, edm_documents, files, auth_audit_logs, user_change_audit_logs
API error normalization	Ensure all error responses follow { statusCode, message, error } contract consistently
Smoke test suite green	npm run test:smoke must pass in CI on every PR
E2E auth flow tests	Playwright tests for sign-in → token refresh → logout
Validate enterprise seed idempotency	Run EnterpriseIamSeed twice against a clean DB, confirm no errors
Phase 2 — IAM & Admin Scale (1–2 weeks)
Goal: Admin can onboard and manage 200+ users via UI without manual DB work.

Task	Details
CSV bulk import backend — finalize	Dry-run validation with structured error report per row; idempotent upsert mode
CSV bulk import UI	Admin page at /dashboard/users/import — upload, review dry-run report, confirm apply
Bulk role/department assignment	Multi-select users in table → assign role or department in one action
Bulk activate/deactivate	Admin can enable/disable accounts in batch
Audit all bulk operations	Every bulk action writes to user_change_audit_logs with actor_id and reason
Role template assignments	Assign a permission template to a role in the matrix UI (not per-user editing)
Permission matrix UI polish	/dashboard/access — make the role-permission grid editable and saveable
Phase 3 — User-Facing Feature Completion (2–3 weeks)
Goal: All advertised features work end-to-end from the UI.

3A. EDM Flows (highest priority)
Task	Details
Document inbox / outbox UI	Functional document list with status badges, routing info, due dates
Document detail page	Full view: content, route stages, timeline, attachments, reply
Approval / rejection / return flow	UI action buttons that call EDM route stage action endpoints
Registration journal UI	/dashboard/documentation/registry — searchable, filterable, export-ready
Route template management	Create/edit approval workflow templates in admin UI
Document alerts	/dashboard/documentation/alerts with read/dismiss actions
3B. Files UX
Task	Details
File list with filters	Status, MIME type, department scope, date range
Attach files to tasks/documents	File picker modal reusable across task and EDM document forms
Upload error UX	Clear messages for size exceeded, unsupported MIME, quota
Presigned upload progress	Show upload progress bar for large files
3C. GIS Module (MVP)
Task	Details
Incident entity + migration	gis_incidents table: location (lat/lng), severity, status, department
Incident CRUD API	POST/GET/PATCH/DELETE /api/gis/incidents with RBAC
Map view UI	Leaflet map with incident markers, click to see detail panel
Incident filter panel	Filter by severity, status, department, date range
Incident create/edit form	Form with map pin picker for location
3D. Analytics Dashboards
Task	Details
Operational metrics API	Aggregate endpoints: tasks by status, documents by department, file counts
Analytics dashboard UI	Recharts-based charts on /dashboard/analytic
Drill-down tables	Click a chart segment → filtered list of relevant records
Prediction MVP	Minimal backend endpoint returning stub forecast; frontend placeholder block
Phase 4 — Operations & Reliability (1–2 weeks)
Goal: Production runtime is observable, recoverable, and documented.

Task	Details
Docker Compose finalization	docker-compose.prod.yml with Postgres, Redis, backend, frontend, Nginx/Caddy
Environment config validation	ConfigService validates all required env vars at startup; crash-fast if missing
Health check endpoints	GET /health → checks DB + Redis connectivity; used by load balancer
Structured logging	Replace console.log with NestJS Logger; JSON format for production
Error rate alerting	Alert on >5% 5xx rate in any 5-minute window
Auth failure spike alert	Alert on >20 failed sign-ins/minute (possible brute force)
Redis health monitoring	Alert on Redis connection loss (fallback in-memory is not safe for production)
Backup runbook	Postgres pg_dump schedule + restore drill documented and tested
Incident runbook	Steps for auth outage, DB unreachable, S3 unavailable
Phase 5 — Controlled Rollout (1 week + stabilization)
Wave	Scope	Go/No-Go Criteria
Wave 0	Admin user only	All migrations clean, seed runs green, auth flows pass UAT
Wave 1	20–30 users, 2–3 pilot departments	No Sev-1 bugs in 3 days, EDM flows validated by department head
Wave 2	Full 200+ user rollout	Wave 1 stable, bulk import tested at scale, monitoring active
Phase 6 — Communication Module (post-launch, 4–6 weeks)
Goal: Implement the COMMUNICATION zone which is already wired into the permission/zone system.

Task	Details
Design: chat vs notification scope	Decide: real-time WebSocket chat vs async notification inbox
Chat rooms model	chat_rooms, chat_messages entities + migration
WebSocket gateway	NestJS @WebSocketGateway with JWT auth and Redis pub/sub
Chat UI	Per-conversation message thread, unread badge, sidebar entry
WebRTC calls (stretch)	Signaling server design; defer until chat is stable
Priority Matrix (Next 2 Sprints)
NOW (Week 1–2):
1. Promote/discard migration draft
2. Fix unit test mocks → npm test green
3. Normalize list endpoint pagination
4. Finalize bulk CSV import backend + dry-run

NEXT (Week 3–4):
1. CSV import UI + audit logs
2. EDM inbox/approval UI flows
3. File attachment UX
4. GIS incident entity + basic map UI

Definition of Done — "Production Ready"
npm test and npm run test:smoke green in CI on every PR
All DB migrations fully represent live schema (no untracked drift)
Admin can onboard 200 users via CSV import in one batch
EDM document workflows (submit → route → approve/reject) work end-to-end from UI
GIS incident CRUD works with map view
Analytics dashboard shows live operational data
GET /health returns 200 and checks DB + Redis
Docker Compose prod config tested
Backup/restore drill completed
Monitoring + alerting active before Wave 1 pilot