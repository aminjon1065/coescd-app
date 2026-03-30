## Frontend Workflow

Стандартный пакетный менеджер для frontend: `npm`.

```bash
npm ci
npm run dev
npm run build
```

## Main Commands

- `npm run dev` - локальная разработка
- `npm run build` - production build
- `npm run test:e2e` - Playwright e2e
- `npm run audit:dashboard-policies` - проверка route policy матрицы

## Runtime

- Framework: Next.js App Router
- UI: Tailwind CSS + shadcn/ui
- Data: Axios + React Query
- Auth: access token + refresh через cookie-flow

`NEXT_PUBLIC_API_URL` должен указывать на backend API.

## Start

После `npm run dev` приложение доступно на `http://localhost:3000`.
