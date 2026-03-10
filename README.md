# Reddit LeadGen SaaS

AI-powered Reddit lead generation. **Hybrid architecture**: Supabase (Auth + DB + CRUD) + NestJS (Reddit scanner + AI).

## Architecture

```
Frontend (Next.js)
  ├→ Supabase REST (campaigns, leads) — direct, 0 backend
  └→ NestJS API (scan-now, AI score/reply)

NestJS Backend
  ├→ Reddit API (snoowrap, cron hourly)
  ├→ OpenAI (scoring + reply)
  └→ Supabase (insert leads via service_role)

Supabase
  ├→ Postgres + RLS
  └→ Auth (Email)
```

## Quick Start

### 0. Node

В корне лежит `.nvmrc` с рекомендуемой версией Node (20.19+). С nvm:

```bash
nvm use
# или: nvm install
```

Если `yarn install` ругается на версию Node, используй: `yarn install --ignore-engines`.

### 1. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL: `supabase/migrations/001_initial_schema.sql` (Dashboard → SQL Editor)
3. Enable Email auth in Authentication → Providers

### 2. Environment

Один источник переменных — корневой `.env`:

```bash
cp .env.example .env
# Заполни: SUPABASE_*, REDDIT_*, AI_*, NEXT_PUBLIC_* и др.
```

Переменные `NEXT_PUBLIC_*` при запуске `yarn dev` / `yarn build` автоматически копируются в `apps/frontend/.env.local` (скрипт `scripts/sync-frontend-env.js`). Ручной копировать не нужно.

### 3. Run

Запуск из корня репозитория (чтобы подхватывался `.env`):

```bash
yarn install
# Оба приложения
yarn dev
# Или по отдельности:
yarn dev:backend   # :3001
yarn dev:frontend  # :3000 (перед стартом синхронизирует env из корня)
```

## API

**Supabase REST** (direct from frontend):
- `campaigns` — CRUD via Supabase client
- `leads` — SELECT via Supabase client (RLS)

**NestJS** (heavy jobs):
- `POST /api/reddit/scan-now` — manual scan trigger
- `POST /api/ai/score-lead` — rescore lead (Bearer token)
- `POST /api/ai/generate-reply-lead` — AI reply (Bearer token)
- `GET /api/jobs/status` — service status

## Reddit API

- **Cron**: hourly.
- **User-Agent**: `CommunityInsights/1.0`.

## Deploy

- Frontend: Vercel
- Backend: Render / Railway
- DB + Auth: Supabase

## License

MIT
