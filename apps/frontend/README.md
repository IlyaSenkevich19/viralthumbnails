# Frontend (Next.js)

**ViralThumblify** web app: **Next.js 14 App Router**, Supabase Auth, TanStack Query, Tailwind. Browser calls **`/api/*`** on the same origin; Next **rewrites** those requests to the Nest backend (see `next.config.mjs`).

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
| Public | `/` (sign in), `/auth/register` (короткая форма: Google или email+пароль; квал лидов — модалка после входа в приложение) |
| App shell (sidebar) | `/dashboard`, `/projects`, `/projects/[id]`, `/projects/[id]/variants`, `/templates`, `/avatars`, `/credits`, `/settings` (+ admin `/admin/youtube-inspiration`) |

Protected routes rely on **middleware** + Supabase session (`src/middleware.ts`, `src/lib/supabase/middleware.ts`).  
`/projects/new` is rewritten to `/dashboard` (see middleware).

## How API calls work

- Frontend code uses **`fetch('/api/...')`** (via `src/lib/api/fetch-json.ts`) with the user’s **Bearer** token.
- **`next.config.mjs`** rewrites:

  ` /api/:path*  →  ${NEXT_PUBLIC_BACKEND_URL}/api/:path*`

- Default backend in dev: `http://localhost:3001`. In production, set **`NEXT_PUBLIC_BACKEND_URL`** to your deployed API origin (no trailing slash).

No separate `NEXT_PUBLIC_API_URL` is required for the current codebase.

### Backend feature parity (high level)

| Backend area | Frontend |
|--------------|----------|
| Auth, projects CRUD, variant generate/delete | Projects list/detail/variants, hooks in `src/lib/api/projects.ts` |
| Templates, niches | `/templates`, `templatesApi` |
| Avatars | `/avatars`, `avatarsApi` |
| Billing credits | `/credits`, sidebar/header credits, `billingApi` |
| **`POST /api/thumbnails/pipeline/run-video`** | **New project → tab “Upload video”**: multipart upload or `videoUrl`, optional count/style; pipeline persists a project and variants (`thumbnailsApi`, `usePipelineVideoRunMutation`) |
| Admin YouTube inspiration | `/admin/youtube-inspiration` (when `ADMIN_USER_IDS` matches) |

Pipeline create flows are wired end-to-end for prompt/YouTube/video modes, including persisted `projects` + `thumbnail_variants`.

## Environment variables

### Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the **anon** (publishable) key in the browser only. The app expects this exact name (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), not `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

**Vercel:** add both variables under **Project → Settings → Environment Variables**, enable them for **Production** (and **Preview** if you use preview deploys). Then trigger a **new deployment** — Next.js bakes `NEXT_PUBLIC_*` into the JS at **build** time; changing env without redeploy leaves the old bundle without keys.

### Recommended

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

- **Branding** — fixed wordmark in `src/config/site.ts` (`brandWordmark` → ViralThumblify).
- **`NEXT_PUBLIC_BACKEND_URL`** — Nest API base for rewrites; in production, your Railway/Render/Fly/Cloud Run URL.

### Monorepo env sync

From the **repo root**, `yarn dev` / `yarn build` runs `scripts/sync-frontend-env.js`, which copies **`NEXT_PUBLIC_*`** from root **`.env`** into **`apps/frontend/.env.local`**. CRM webhook (`LEAD_INTAKE_WEBHOOK_URL`) остаётся только в корневом `.env` для Nest — в фронтовый `.env.local` не копируется.

### Leads / CRM (через backend)

- **В приложении (после логина):** `POST /api/auth/lead-qualification` с Bearer — см. `completeLeadQualification` в `src/lib/api/auth-bootstrap.ts`, модалка `LeadQualificationModal`.
- **Публично (лендинг, без JWT):** `POST /api/leads/intake` — обёртка `submitPublicLeadIntake` в `src/lib/api/leads.ts` (тот же origin `/api/...` → rewrite на Nest).

Не вызывайте URL Google Apps Script из браузера напрямую — секрет и контракт живут на сервере.

**`apps/frontend/.env.development`** is loaded only for `next dev` and defaults `NEXT_PUBLIC_BACKEND_URL` to `http://localhost:3001`. Production builds on Vercel use **`NODE_ENV=production`**, so that file is not applied there — use Vercel env vars instead. See root **`README.md`** (“Local vs production”).

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
3. Middleware refreshes session and gates protected routes (redirect to `/` when unauthenticated).
4. Пока `leadQualificationCompleted === false` в `/auth/me`, в приложении показывается модалка квала; отправка — `completeLeadQualification` → `POST /api/auth/lead-qualification` (CRM на сервере, см. раздел Leads / CRM выше).

## Deployment (e.g. Vercel)

- Set **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`NEXT_PUBLIC_BACKEND_URL`** (production API) in the host’s environment.
- **Analytics** (see `src/components/marketing/marketing-scripts.tsx`): set **`NEXT_PUBLIC_GTM_ID`** only. Configure GA4, Google Ads, and cross-domain linker inside the GTM container. Redeploy after changing `NEXT_PUBLIC_*`.
- Ensure the backend **`FRONTEND_URL`** (CORS) includes your Vercel domain.

## Monorepo

For backend env, Supabase migrations, and full-stack quick start, see the root **`README.md`** and **`apps/backend/README.md`**.
