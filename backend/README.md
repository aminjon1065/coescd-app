## Backend Для плафтормы

### EDM Alerts Scheduler

Автоматический запуск обработки уведомлений/просрочек СЭД работает по cron.

- `EDM_ALERTS_SCHEDULER_ENABLED`:
  - `true` (по умолчанию) — scheduler включен
  - `false` — scheduler выключен
- `EDM_ALERTS_CRON`:
  - cron-выражение запуска
  - по умолчанию: `*/10 * * * *` (каждые 10 минут)
- `EDM_ALERTS_RUN_ON_STARTUP`:
  - `true` — сделать один запуск сразу при старте приложения
  - `false` (по умолчанию)
- `EDM_REMINDER_WINDOW_HOURS`:
  - окно напоминаний "скоро дедлайн"
  - по умолчанию: `24`
- `EDM_ESCALATION_THRESHOLD_HOURS`:
  - порог для escalation после просрочки
  - по умолчанию: `24`

### Ops Baseline (Monitoring + Backup Readiness)

Новые endpoint'ы:

- `GET /ops/health/live` (без авторизации) — liveness probe
- `GET /ops/health/ready` (без авторизации) — readiness probe (включая проверку БД)
- `GET /ops/metrics` (только `Admin`) — HTTP/Auth/Process метрики + ops alerts
- `GET /ops/backup/status` (только `Admin`) — статус backup политики и freshness

Настройки через env:

- `HTTP_WINDOW_ERROR_RATE_THRESHOLD` (default: `0.2`)
- `HTTP_WINDOW_MIN_REQUESTS` (default: `20`)
- `PROCESS_HEAP_WARN_MB` (default: `512`)
- `BACKUP_REQUIRED` (default: `true`)
- `BACKUP_MAX_AGE_HOURS` (default: `26`)
- `BACKUP_LAST_SUCCESS_AT` (ISO datetime последнего успешного backup)

### EDM Load Testing + Indexing

- Добавлена migration индексов: `20260219080000-EdmPerformanceIndexesV2.ts`
- Покрывает hot-path запросы EDM: документы, маршруты, этапы, алерты, журнал регистрации, шаблоны.

Нагрузочный прогон:

```bash
npm run test:load:edm
npm run test:load:edm:profile
```

Переменные для сценария:

- `LOAD_API_URL` (default: `http://localhost:8008/api`)
- `LOAD_USER_EMAIL` (default: `edm-manager1@test.local`)
- `LOAD_USER_PASSWORD` (default: `manager123`)
- `LOAD_CONNECTIONS` (default: `30`)
- `LOAD_DURATION_SECONDS` (default: `20`)

Для mixed-profile сценария (`test:load:edm:profile`):

- `LOAD_MANAGER_EMAILS` / `LOAD_MANAGER_PASSWORDS` (comma-separated)
- `LOAD_OPERATOR_EMAILS` / `LOAD_OPERATOR_PASSWORDS` (comma-separated)
- `LOAD_ADMIN_EMAILS` / `LOAD_ADMIN_PASSWORDS` (comma-separated)
- `LOAD_MANAGER_CONNECTIONS` (default: `24`)
- `LOAD_OPERATOR_CONNECTIONS` (default: `18`)
- `LOAD_ADMIN_CONNECTIONS` (default: `8`)
- `LOAD_DURATION_SECONDS` (default: `30`)
- `LOAD_ROLES` (default: `manager,operator,admin`)
  - пример: `LOAD_ROLES=manager,admin` (если нет operator-аккаунта)
- `LOAD_STRICT_ROLES` (default: `false`)
  - `true`: падать, если любая роль не авторизовалась
  - `false`: пропускать недоступную роль и тестировать остальные
