# 🧱 Архитектура платформы КЧС

## 🧭 Текущее состояние

### ✅ Реализовано

- **Backend**: NestJS + PostgreSQL (TypeORM)
- **Frontend**: Next.js App Router + TailwindCSS + Shadcn
- **IAM/Auth**:
  - Cookie-based JWT (access + refresh)
  - `RolesGuard`, `PermissionsGuard`, `PoliciesGuard`
  - RBAC + базовый ABAC (scope по owner/department)
  - DB-backed role permissions matrix (`/api/iam/authorization/matrix`)
  - CSRF (double-submit) для refresh/logout
  - Rate-limit/lockout для auth endpoints
  - Auth audit log (`auth_audit_logs`)
  - User change audit log (`user_change_audit_logs`)
  - Session lifecycle: `change-password`, `logout-all-devices`, disable user
- **Модули API**:
  - `users`, `department`, `task`, `document`, `analytics`, `files`
- **Качество**:
  - e2e матрица RBAC+ABAC+auth hardening + files (presigned flow, limits, audit)
- **Схема БД**:
  - `synchronize: false`
  - TypeORM migrations + CLI scripts
  - bootstrap migration для пустой БД

### 🟡 В процессе

- Полное покрытие миграциями всей текущей схемы (migration coverage audit, baseline уже bootstrap-ом)
- Полный unit test stabilization (`npm test`) для legacy spec-файлов с корректными DI-моками
- Операционная финализация production runtime (compose/monitoring/backup runbook)

### 🔜 Планируется

- `files` (MinIO/S3 + metadata + RBAC/ABAC + audit)
- `gis` (PostGIS layers/features)
- `chat` (WebSocket rooms/messages)
- `calls` (WebRTC signaling)
- Интеграция prediction/ML

---

## 📦 Backend (фактические модули)

### 1. `iam`

- Вход/refresh/logout/logout-all-devices
- Смена пароля и ревокация сессий
- Роли, permissions, policy-based access
- Защита auth: csrf + rate-limit + lockout + audit

### 2. `users` + `department`

- Пользователи, департаменты, роли, custom permissions
- Admin control: изменение `isActive`

### 3. `task`

- CRUD задач
- RBAC + ABAC (owner/department scope)
- attachment endpoints:
  - `GET /api/task/:id/files`
  - `POST /api/task/:id/files/:fileId`
  - `DELETE /api/task/:id/files/:fileId`

### 4. `document`

- CRUD документов (`incoming`, `outgoing`, `internal`)
- RBAC + ABAC (owner/department scope)
- attachment endpoints:
  - `GET /api/documents/:id/files`
  - `POST /api/documents/:id/files/:fileId`
  - `DELETE /api/documents/:id/files/:fileId`

### 5. `analytics`

- Типы/категории/события
- Базовые отчеты и prediction-заглушка

### 6. `files`

- Upload/download/list/delete + link API
- S3/MinIO storage adapter
- Опциональный presigned URL flow (`/files/upload-url`, `/files/upload-complete`, `/files/:id/download-url`)
- MIME whitelist + upload size limits через env
- RBAC + ABAC scope + file access audit
- e2e покрытие: permission checks, ABAC cross-department, presigned flow, audit trail

---

## ✅ Core Readiness (MVP)

- IAM/Auth hardening: done
- RBAC + ABAC for users/documents/tasks/files: done
- Files module MVP + domain integrations (`documents`, `task`): done
- Core migrations for auth/files: done
- E2E security/access matrix: done

## ⚠️ Remaining Gaps To Production Core

- Migration coverage audit for all existing schema objects
- Legacy unit tests stabilization (`npm test`) to green
- Production ops checklist:
  - runtime compose baseline
  - metrics/alerts
  - backup/restore and incident runbook

---

## 🧩 Frontend (фактический статус)

- App Router, dashboard pages, auth context
- Axios клиент с bearer + refresh
- CSRF header для `refresh/logout`
- Admin screens:
  - Departments CRUD + chief assignment
  - Access Control: role matrix editing + custom user permissions
  - Audit Logs: auth/user/files unified feed

---

## 🔒 Безопасность

- `@Roles()`, `@Permissions()`, `@Policies()`
- JWT + refresh rotation
- CSRF double-submit для cookie-flow
- Sign-in lockout и refresh rate-limit
- Auth audit log

---

## ☁️ Инфраструктура

- **PostgreSQL**
- **Redis** (refresh/session storage; fallback in-memory для тестов)
- **Docker/Compose**: требуется актуализация под финальный runtime стек

---

## 🛠️ Операционные команды (backend)

```bash
npm run build
npm run test:e2e
npm run seed:iam
npm run migration:run
npm run migration:revert
```

---

## 📚 Документация

- `docs/architecture.md` — целевая архитектура
- `docs/rbac.md` — RBAC/ABAC и auth hardening
- `docs/migrations.md` — процесс миграций
- `docs/implementation-plan.md` — phased plan to production (`1 admin -> 200+ users`)
- `docs/migration-coverage-audit-2026-02-18.md` — текущий аудит покрытия миграциями
- `docs/phase-1-core-hardening-backlog.md` — тикеты и порядок работ на Phase 1
- `docs/bulk-user-import-spec.md` — technical spec for CSV onboarding (`dry-run + apply`)
- `docs/files-module-plan.md` — план и архитектура модуля files
- `docs/files-api.md` — API contract and examples for files module
