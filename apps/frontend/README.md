# Frontend

Next.js App Router frontend for the template monorepo.

## Stack

- Next.js 14 (App Router)
- Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`)
- Tailwind CSS
- React Query

## What is included

- Public pages:
  - `/`
  - `/auth/login`
  - `/auth/register`
- Protected pages:
  - `/dashboard`
  - `/settings`
- Route protection middleware via Supabase session check
- Sidebar layout + auth context
- API rewrite from `/api/*` to backend

## Environment variables

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

Recommended:

```env
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Optional:

```env
NEXT_PUBLIC_API_URL=
```

Notes:

- This code expects `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`).
- In this monorepo, `NEXT_PUBLIC_*` vars are synced from root `.env` to `apps/frontend/.env.local` by `scripts/sync-frontend-env.js`.

## Run

From repo root:

```bash
yarn dev:frontend
```

Directly in this package:

```bash
yarn dev
```

## Build

```bash
yarn build
yarn start
```

## Auth flow

- Login/register use Supabase browser client from `src/lib/supabase/client.ts`.
- `src/contexts/auth-context.tsx` stores `user` and `accessToken`.
- `src/middleware.ts` + `src/lib/supabase/middleware.ts` redirect unauthenticated users from protected routes to `/auth/login`.

For full monorepo setup, see root `README.md`.
