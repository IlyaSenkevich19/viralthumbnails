# Reddit LeadGen SaaS

AI-powered Reddit lead generation. **Hybrid architecture**: Supabase (Auth + DB + CRUD) + NestJS (Reddit scanner + AI).

## Architecture

```
Frontend (Next.js)
  ├→ Supabase REST (campaigns, leads) — direct, 0 backend
  └→ NestJS API (scan-now, AI score/reply)

NestJS Backend
  ├→ Reddit API (snoowrap, cron every 5 min)
  ├→ OpenAI (scoring + reply)
  └→ Supabase (insert leads via service_role)

Supabase
  ├→ Postgres + RLS
  └→ Auth (Email)
```

## Quick Start

### 1. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL: `supabase/migrations/001_initial_schema.sql` (Dashboard → SQL Editor)
3. Enable Email auth in Authentication → Providers

### 2. Environment

```bash
cp .env.example .env
# Fill: SUPABASE_*, REDDIT_*, AI_API_KEY, NEXT_PUBLIC_API_URL
```

### 3. Run

```bash
yarn install
# Backend
yarn workspace backend dev   # :3001
# Frontend
yarn workspace frontend dev # :3000
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

## Deploy

- Frontend: Vercel
- Backend: Render / Railway
- DB + Auth: Supabase

## License

MIT
