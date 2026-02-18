# Master Plan 0.1

## 1. Vision
Построить единую рабочую систему для департаментов с ролевым доступом, где ежедневная работа идет через:
- СЭД (документы, маршруты, резолюции, контроль сроков)
- Файлы (доступ, шаринг, аудит)
- Работники (оргструктура и управляемое создание пользователей)
- Переписка и видеочат
- Данные по ЧС (по разрешениям)
- Аналитика и GIS (для аналитического контура)

## 2. Scope (v1)
### In scope
- Ролевые дашборды
- Полноценный операционный контур СЭД
- Файлы с ACL и audit trail
- Staff management с ограничением по департаментам
- Базовый chat + video workflow
- Данные ЧС и аналитический GIS-контур
- Security/Ops baseline (health, metrics, backup readiness, access tests)

### Out of scope (после v1)
- ИИ-прогнозирование ЧС
- OCR, криптоподпись, сложные внешние интеграции

## 3. Role Model
- `Admin`: глобальные настройки, пользователи, департаменты, права, ops, аудит.
- `DepartmentHead`: управление сотрудниками только своего департамента, задачи, контроль исполнения.
- `Employee`: СЭД, задачи, файлы, переписка, видеочат, разрешенные ЧС-данные.
- `Analyst`: весь базовый контур + управление ЧС-данными + GIS + аналитика.
- `Chairman/Deputy` (опционально отдельная роль): расширенный междепартаментный контур СЭД.

## 4. Product Modules
- `IAM` (RBAC + ABAC + scope)
- `EDM`
- `Tasks`
- `Files`
- `Users/Departments`
- `Chat`
- `Video`
- `Disaster Data`
- `GIS`
- `Ops`

## 5. Architecture Principles
- Contract-first: сначала DTO/API контракт, потом UI.
- Permission-first: каждое действие связано с конкретным permission.
- Scope enforcement: `self`, `department`, `global` обязательно в backend policy.
- Audit-by-default: критичные действия всегда в журнал.
- Feature slices: фронт + бэк + тесты + дока в рамках одной фичи.

## 6. Frontend Target Architecture
- Единый App Shell с role-aware navigation.
- Отдельные dashboard home по ролям.
- Отдельные workspaces:
  - `EDM Workspace`
  - `Files Workspace`
  - `Staff Workspace`
  - `Chat/Video Workspace`
  - `Disaster/GIS Workspace`
- Унифицированные UI-паттерны:
  - таблицы
  - фильтры
  - status badges
  - действия в header/action bar
  - empty/error/loading/403 states

## 7. Backend Target Architecture
- NestJS модульная граница по доменам.
- Общая policy-проверка в guards/services.
- Отдельные read-model endpoints для dashboard и операторских экранов.
- Планировщики (cron/queue) для alerting/background jobs.
- Индексация hot paths + нагрузочные профили.

## 8. Release Waves
### Wave 0 (1 неделя) — Architecture Freeze
- Заморозка role matrix.
- Заморозка IA (information architecture) фронта.
- Заморозка API contracts для Wave 1.
- Итог: нельзя начинать разработку wave без утвержденных документов.

### Wave 1 (2 недели) — IAM + Role Dashboards + Staff Guardrails
- Backend:
  - permission matrix final
  - my-dashboard API по ролям
  - правило: head создает пользователей только в своем департаменте
  - audit на user lifecycle
- Frontend:
  - role-based home/dashboard
  - staff management UX с ограничениями
- QA:
  - e2e по ролям (`admin`, `head`, `employee`, `analyst`)

### Wave 2 (2 недели) — Core Operations: EDM + Files
- Backend:
  - EDM UX endpoints и статусы
  - files ACL/share policies
- Frontend:
  - операторский СЭД (журналы, карточка, маршрут, резолюции)
  - files workspace (доступ, шаринг, связи с документами)
- QA:
  - сквозной сценарий: `document -> resolution -> task -> control`

### Wave 3 (2 недели) — Chat + Video
- Backend:
  - каналы, сообщения, room/session policy
- Frontend:
  - переписка по департаментам/документам
  - видеосессии из контекста задачи/документа
- QA:
  - сценарии доступа и журналирования

### Wave 4 (2 недели) — Disaster Data + GIS (Analyst)
- Backend:
  - disaster data lifecycle
  - GIS service endpoints
- Frontend:
  - analyst workspace для данных и карты
- QA:
  - role and scope tests для analyst-only функций

### Wave 5 (1 неделя) — Hardening + RC
- Нагрузочные прогоны
- Security review
- Backup/restore drill
- Закрытие критичных багов
- Release candidate

## 9. Cross-Cutting Deliverables (каждая wave)
- Backend код
- Frontend экраны
- Unit + e2e tests
- Docs update
- Changelog

## 10. Definition of Done (DoD)
Фича считается завершенной только если:
- API и права реализованы.
- UI готов для целевой роли.
- Есть e2e на позитивный и запрещенный сценарии.
- Есть audit logs для чувствительных операций.
- Обработаны empty/error/403 состояния.
- Документация обновлена.

## 11. Quality Gates
- `build` зеленый.
- `test:e2e` зеленый.
- Нет критичных уязвимостей в релизном блоке.
- Нет сломанных role/scope boundary.
- p95 на ключевых endpoint не деградирует относительно baseline.

## 12. Security & Operations Baseline
- Health probes: liveness/readiness.
- Ops metrics + alerts.
- Backup freshness policy.
- Rate limiting и auth audit.
- Role/scope regression suite.

## 13. Performance Strategy
- Индексы под hot queries.
- Профильная нагрузка по ролям.
- Регулярные baseline прогоны перед релизом.
- Оптимизация по фактическим bottleneck (а не "вслепую").

## 14. Risks and Mitigations
- Размытые требования ролей.
  - Mitigation: freeze matrix до реализации.
- Расхождение фронт/бэк контрактов.
  - Mitigation: contract-first + weekly sync.
- Scope creep.
  - Mitigation: только wave backlog, без side-epics.
- Регрессия доступа.
  - Mitigation: mandatory e2e role suites.

## 15. Governance
- Еженедельный planning по wave.
- Ежедневный короткий sync по blockers.
- Demo только рабочих end-to-end сценариев.
- Retro с обязательной фиксацией действий на следующий cycle.

## 16. Next Immediate Artifacts
Создать и поддерживать в актуальном состоянии:
- `docs/architecture/roles-permissions-matrix.md`
- `docs/architecture/frontend-information-architecture.md`
- `docs/architecture/wave-1-delivery-plan.md`

## 17. Current Status (на момент MasterPlan 0.1)
- EDM backend core: реализован (включая отчеты и exports).
- Ops baseline: реализован (health/metrics/backup status).
- Performance baseline: индексы + load scripts добавлены.
- Frontend EDM: начата переработка в операторский формат.
- Следующий обязательный шаг: закрыть Wave 1 артефакты и зафиксировать role matrix.
