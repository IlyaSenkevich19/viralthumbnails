# Backend (NestJS)

API for **ViralThumbnails**: Supabase-backed projects, thumbnail variants, template catalog, and optional **Google Gemini / Imagen** generation.

- **Global prefix:** `/api` (e.g. health is `GET /api/health`)
- **OpenAPI:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs) when running locally
- **Env files:** reads `.env` in this folder or repo root `../../.env` (see `app.module.ts`)

## Stack

| Piece | Role |
|--------|------|
| NestJS 10 | HTTP API, modules, validation |
| `@supabase/supabase-js` | JWT verification (anon) + Admin client (service role) |
| `class-validator` | DTO validation + `ValidationPipe` (whitelist, forbid unknown fields) |
| Swagger | `/api/docs` |

## Modules (high level)

| Module | Responsibility |
|--------|----------------|
| **Auth** | `SupabaseGuard` (Bearer JWT), `GET /api/auth/me` |
| **Health** | Liveness-style check |
| **Projects** | CRUD projects, list/delete variants, trigger generation |
| **Templates** | List/create templates; niches + Storage paths (see Swagger) |
| **AI** | Imagen (or placeholder) + upload variant image to Storage |
| **Storage** | Signed URLs, uploads to `project-thumbnails` / `thumbnail-templates` |
| **Supabase** | Injectable wrapper around admin client |

Cross-cutting: global **HTTP exception filter** (sanitizes non-HTTP errors in production), **shutdown hooks** for graceful stop.

## Environment variables

### Required

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

- **Anon key** — `SupabaseGuard` validates the user’s JWT (`auth.getUser`).
- **Service role** — server-side DB/Storage (bypasses RLS); keep secret, never expose to the browser.

### Server / CORS

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

`FRONTEND_URL` is passed to `enableCors` (production: set to your real frontend origin, e.g. Vercel URL).

### Optional — AI (Gemini Imagen)

Without `GEMINI_API_KEY`, generation falls back to a placeholder image URL (useful for local UI tests).

```env
GEMINI_API_KEY=
GEMINI_IMAGEN_MODEL=imagen-4.0-fast-generate-001
GEMINI_IMAGEN_TIMEOUT_MS=120000
```

### Optional — Storage signed URLs

```env
SUPABASE_STORAGE_SIGN_EXPIRES_SEC=3600
```

## Database & Storage

SQL migrations live in the monorepo: **`supabase/migrations/`**. Apply them in the Supabase SQL Editor or via Supabase CLI so tables (`projects`, `thumbnail_variants`, `thumbnail_templates`, `profiles`, …) and Storage policies exist before calling the API.

## Scripts

From **repo root**:

```bash
yarn dev:backend
```

From **`apps/backend`**:

```bash
yarn dev          # nest start --watch
yarn build
yarn start:prod   # node dist/main
yarn lint
```

## Quick API check

```bash
curl -s http://localhost:3001/api/health
curl -s -H "Authorization: Bearer <supabase_access_token>" http://localhost:3001/api/auth/me
```

Use Swagger at `/api/docs` for authenticated routes (`Authorize` with the same Bearer token).

## Deployment note

This app is a **long-running Node HTTP server** (`listen`). Host it on platforms meant for that (Railway, Render, Fly.io, Cloud Run, a VPS), not as a substitute for Vercel serverless functions. Set the same env vars in the host; point the frontend’s `NEXT_PUBLIC_BACKEND_URL` (or your Next rewrite target) at the deployed API origin.

## Monorepo

For full-stack setup (frontend env sync, Turborepo), see the root **`README.md`**.
