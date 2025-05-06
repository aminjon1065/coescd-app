# 🧱 Архитектура платформы КЧС

## 🧭 Общая структура

* **Backend**: NestJS + PostgreSQL + WebSocket (gateway)
* **Frontend**: Next.js 15 App Router + TailwindCSS + Shadcn
* **Auth**: Cookie-based JWT, roles & permissions
* **Infra**: Redis (queues & pub/sub), MinIO/S3, PostGIS

---

## 📦 Backend (NestJS)

### 1. `auth`

* Регистрация, вход, refresh токены
* Защита: `RolesGuard`, `PermissionsGuard`, `PoliciesGuard`
* Cookie-based с HttpOnly refresh

### 2. `users`

* Пользователи, департаменты, роли
* Структура: Главное управление → Управление → Отдел → Отделение

### 3. `analytics`

* ЧС-события: CRUD
* Отчёты по регионам и периодам
* Подключение модуля `prediction` (ИИ)

### 4. `documents`

* `incoming`, `outgoing`, `internal`
* Вложенные файлы, статусы, история изменений
* Привязка к департаменту

### 5. `files`

* Загрузка, скачивание, структура папок
* Контроль доступа по ролям
* Версионирование (опционально)

### 6. `gis`

* Карты и слои: PostGIS
* ЧС зоны, опасные участки, полигоны
* API для отображения в OpenLayers/Mapbox

### 7. `chat`

* Комнаты, сообщения
* WebSocket Gateway
* Seen, online, typing-индикаторы

### 8. `calls`

* Видеоконференции через WebRTC signaling
* Видеозвонки 1:1 и групповые
* Интеграция с календарём (планирование)

---

## 🧩 Frontend (Next.js)

### Layout и Shell

* AppSidebar: динамика + `CanAccess`
* Header: PageBreadcrumbs по текущему пути
* AuthProvider + middleware.ts

### Роутинг

```
/analytics
/analytics/reports
/documents/incoming
/documents/outgoing
/files
/gis
/chat/:roomId
/calls/:id
```

### Компоненты

* Таблицы с фильтрами и пагинацией
* Editor для отчётов и документов
* FileDropZone + TreeView
* OpenLayers карта с легендами и слоями
* Чат: Scroll + input + attachments
* Видеозвонки: WebRTC media + controls

---

## 🔒 Доступ и безопасность

* `@Roles()`, `@Permissions()`, `@Policies()`
* Frontend: `CanAccess`, SSR middleware
* Защита API: rate-limit, csrf, XSS-safe

---

## ☁️ Инфраструктура

* **PostgreSQL** + **PostGIS**: геоданные
* **Redis**: очередь задач + WebSocket pub/sub
* **MinIO**: хранение файлов
* **Sentry/Logtail**: мониторинг и логирование
* **Docker + Docker Compose**

---

## 🚧 В дальнейшем

* Подключение ИИ предсказания (FastAPI / Python)
* Push-уведомления (Web + Mobile)
* Мобильное приложение на React Native Expo
* Управление инцидентами в реальном времени (LiveMap + голосовой вызов)
