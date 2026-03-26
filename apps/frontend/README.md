# Frontend (Next.js)

**ViralThumbnails** web app: **Next.js 14 App Router**, Supabase Auth, TanStack Query, Tailwind. Browser calls **`/api/*`** on the same origin; Next **rewrites** those requests to the Nest backend (see `next.config.mjs`).

## Stack

| Piece | Role |
|--------|------|
| Next.js 14 (App Router) | Routing, RSC where used, `middleware` |
| `@supabase/ssr` + `@supabase/supabase-js` | Session cookies, client/server Supabase helpers |
| TanStack Query | Server state (projects, templates, credits, …) |
| Tailwind CSS | Styling (`tailwind.config.ts`, `globals.css`) |
| `sonner` | Toasts |
| `lucide-react` | Icons |

## Routes (overview)

| Area | Paths |
|------|--------|
| Public | `/` (landing), `/auth/login`, `/auth/register` |
| App shell (sidebar) | `/dashboard`, `/projects`, `/projects/[id]`, `/projects/[id]/variants`, `/templates`, `/credits`, `/settings`, `/ab-tests` |

Protected routes rely on **middleware** + Supabase session (`src/middleware.ts`, `src/lib/supabase/middleware.ts`).  
`/projects/new` is rewritten to `/dashboard?openNewProject=1` (see middleware).

## How API calls work

- Frontend code uses **`fetch('/api/...')`** (via `src/lib/api/fetch-json.ts`) with the user’s **Bearer** token.
- **`next.config.mjs`** rewrites:

  ` /api/:path*  →  ${NEXT_PUBLIC_BACKEND_URL}/api/:path*`

- Default backend in dev: `http://localhost:3001`. In production, set **`NEXT_PUBLIC_BACKEND_URL`** to your deployed API origin (no trailing slash).

No separate `NEXT_PUBLIC_API_URL` is required for the current codebase.

## Environment variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the **anon** (publishable) key in the browser only. The app expects this exact name (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), not `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Recommended

```env
NEXT_PUBLIC_APP_NAME=Viral Thumbnails
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

- **`NEXT_PUBLIC_APP_NAME`** — branding (`src/config/site.ts`: title, sidebar, etc.).
- **`NEXT_PUBLIC_BACKEND_URL`** — Nest API base for rewrites; in production, your Railway/Render/Fly/Cloud Run URL.

### Monorepo env sync

From the **repo root**, `yarn dev` / `yarn build` runs `scripts/sync-frontend-env.js`, which copies selected `NEXT_PUBLIC_*` (and related) vars from root **`.env`** into **`apps/frontend/.env.local`**. After changing root env, rerun dev or sync so the frontend picks them up.

## Scripts

From **repo root**:

```bash
yarn dev:frontend
```

From **`apps/frontend`**:

```bash
yarn dev      # next dev (default port 3000)
yarn build
yarn start    # production server after build
yarn lint
```

## Project layout (where to edit)

| Path | Purpose |
|------|---------|
| `src/app/` | App Router pages and layouts |
| `src/components/` | UI (shell, projects, modals, `ui/*`) |
| `src/contexts/auth-context.tsx` | Client auth: `user`, `accessToken`, session refresh |
| `src/lib/api/` | Typed `fetch` helpers to `/api/*` |
| `src/lib/hooks/` | React Query hooks |
| `src/lib/query-keys.ts` | Stable query key factories |
| `src/lib/supabase/` | Browser client, server client, middleware helper |
| `src/config/` | Site name, pricing plans, credits defaults |

## Auth flow (short)

1. Login/register: Supabase client in `src/lib/supabase/client.ts`.
2. `AuthProvider` exposes session + token for API calls and Query `enabled` flags.
3. Middleware refreshes session and gates protected routes (redirect to `/auth/login` when needed).

## Deployment (e.g. Vercel)

- Set **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`NEXT_PUBLIC_BACKEND_URL`** (production API), and optional **`NEXT_PUBLIC_APP_NAME`** in the host’s environment.
- Ensure the backend **`FRONTEND_URL`** (CORS) includes your Vercel domain.

## Monorepo

For backend env, Supabase migrations, and full-stack quick start, see the root **`README.md`** and **`apps/backend/README.md`**.
