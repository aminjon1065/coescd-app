# 🧱 Архитектура платформы КЧС

## 🧭 Текущее состояние

### ✅ Реализовано

- **Backend**: NestJS + PostgreSQL (TypeORM)
- **Frontend**: Next.js App Router + TailwindCSS + Shadcn
- **IAM/Auth**:
  - Cookie-based JWT (access + refresh)
  - `RolesGuard`, `PermissionsGuard`, `PoliciesGuard`
  - RBAC + базовый ABAC (scope по owner/department)
  - CSRF (double-submit) для refresh/logout
  - Rate-limit/lockout для auth endpoints
  - Auth audit log (`auth_audit_logs`)
  - Session lifecycle: `change-password`, `logout-all-devices`, disable user
- **Модули API**:
  - `users`, `department`, `task`, `document`, `analytics`, `files`
- **Качество**:
  - e2e матрица RBAC+ABAC+auth hardening
- **Схема БД**:
  - `synchronize: false`
  - TypeORM migrations + CLI scripts

### 🟡 В процессе

- Полное покрытие миграциями всей текущей схемы (migration coverage audit)
- Приведение документации модулей к фактической реализации
- `files` Phase 3: интеграция `file_links` с остальными доменами

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

### 4. `document`

- CRUD документов (`incoming`, `outgoing`, `internal`)
- RBAC + ABAC (owner/department scope)

### 5. `analytics`

- Типы/категории/события
- Базовые отчеты и prediction-заглушка

### 6. `files`

- Upload/download/list/delete + link API
- S3/MinIO storage adapter
- Опциональный presigned URL flow (`/files/upload-url`, `/files/upload-complete`, `/files/:id/download-url`)
- MIME whitelist + upload size limits через env
- RBAC + ABAC scope + file access audit

---

## 🧩 Frontend (фактический статус)

- App Router, dashboard pages, auth context
- Axios клиент с bearer + refresh
- CSRF header для `refresh/logout`

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
- `docs/files-module-plan.md` — план и архитектура модуля files
