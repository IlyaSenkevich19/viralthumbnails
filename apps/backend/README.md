# Backend (NestJS)

API for **ViralThumbnails**: Supabase-backed projects, thumbnail variants, template catalog, and **OpenRouter**-powered thumbnail generation.

- **Global prefix:** `/api` (e.g. health is `GET /api/health`)
- **Root:** `GET /` returns a small JSON map (`health`, `docs`) so deploys don’t show “Cannot GET /”
- **OpenAPI:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs) when running locally
- **Env files:** reads `.env` in this folder or repo root `../../.env` (see `app.module.ts`)

## Stack

| Piece | Role |
|--------|------|
| NestJS 10 | HTTP API, modules, validation |
| `@supabase/supabase-js` | JWT verification (anon) + Admin client (service role) |
| `class-validator` | DTO validation + `ValidationPipe` (whitelist, forbid unknown fields) |
| Swagger | `/api/docs` |

## Карта ответственности (кто за что)

| Модуль / слой | За что отвечает |
|---------------|-----------------|
| **ConfigModule** (+ `src/config/openrouter.config.ts`) | Env; типизированный namespace `openrouter` (`OpenRouterEnvConfig`) с дефолтами для моделей и URL |
| **SupabaseModule** | Admin-клиент Supabase для БД и Storage с сервера |
| **AuthModule** | Проверка JWT (`SupabaseGuard`), `GET /api/auth/me` |
| **HealthModule** | Liveness |
| **StorageModule** | Загрузки и signed URL: проекты, шаблоны, аватары, временное видео / выход `from-video` |
| **BillingModule** | Резерв и возврат кредитов вокруг генерации вариантов и пайплайна `from-video` |
| **OpenRouterModule** (`@Global`) | Один экземпляр `OpenRouterClient` на всё приложение |
| **ProjectThumbnailGenerationModule** | `ProjectVariantImageService` — картинка для одной строки `thumbnail_variants` (OpenRouter или placeholder) |
| **ProjectsModule** | CRUD проектов; `ProjectGenerationService` — оркестрация N вариантов + биллинг + вызов `ProjectVariantImageService` |
| **TemplatesModule** | Каталог шаблонов, ниши, загрузки в `thumbnail-templates` |
| **AvatarsModule** | `GET/POST/DELETE /api/avatars` — лица в `user-avatars` |
| **VideoThumbnailsModule** | Пайплайн `POST /api/thumbnails/from-video`: ingestion → анализ видео → генерация → ранжирование → Storage |

Cross-cutting: **HttpExceptionFilter**, **shutdown hooks**.

### HTTP: два контроллера на пути `projects`

Оба объявлены как `@Controller('projects')`, префикс приложения `/api`:

| Файл | Типичные маршруты |
|------|-------------------|
| `projects.controller.ts` | `GET/POST/...` по самому проекту (список, создание, `GET :id`, `PATCH`, `DELETE`) |
| `thumbnail-variants.controller.ts` | `POST :id/generate`, `GET :id/variants`, `DELETE :id/variants/:variantId` |

Так REST остаётся под ресурсом «проект», а операции с вариантами сгруппированы отдельным контроллером.

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

JSON body size limit is **15MB** in `main.ts` (base64 image uploads). If the frontend uses a **host proxy** (e.g. Next rewrites on Vercel), that platform may enforce a **smaller** max request size (~4.5MB on Vercel) — the frontend downscales avatar images before upload to stay under typical limits.

### Optional — OpenRouter

Defaults and parsing live in **`src/config/openrouter.config.ts`** (`registerAs('openrouter', …)`). Code reads them via `getOpenRouterConfig(config)`.

Without `OPENROUTER_API_KEY`, `POST /projects/:id/generate` still completes but stores a **placeholder** image URL per variant (local UI tests).

| Variable | Role |
|----------|------|
| `OPENROUTER_API_KEY` | Required for real images |
| `OPENROUTER_IMAGE_MODEL` | Project variant generation + video pipeline image step |
| `OPENROUTER_PROJECT_GEN_TIMEOUT_MS` | Timeout for project variant image call (ms) |
| `OPENROUTER_VIDEO_MODEL` | Video analysis (`POST /api/thumbnails/from-video`) |
| `OPENROUTER_RANKING_MODEL` | Thumbnail scoring (optional; falls back to `OPENROUTER_VIDEO_MODEL`) |
| `OPENROUTER_BASE_URL` | API base (default in config file) |
| `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | OpenRouter request headers |

```env
OPENROUTER_API_KEY=
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
# OPENROUTER_HTTP_REFERER=https://your-frontend.example
# OPENROUTER_APP_TITLE=ViralThumbnails
OPENROUTER_IMAGE_MODEL=google/gemini-2.5-flash-image-preview
OPENROUTER_PROJECT_GEN_TIMEOUT_MS=120000
OPENROUTER_VIDEO_MODEL=google/gemini-2.0-flash-001
# OPENROUTER_RANKING_MODEL=google/gemini-2.0-flash-001
```

`POST /api/thumbnails/from-video` (Bearer, `multipart/form-data`): field `file` **or** `videoUrl`, optional `count` (1–12), `style`. Temp uploads live under `{userId}/from-video/temp/…`, outputs under `{userId}/from-video/out/{runId}/…`.

**Кредиты для `from-video`:** списывается **`1 + 2×count`** (один вызов анализа видео + `count` генераций изображений + `count` ранжирований). При ошибке пайплайна после резерва баланс возвращается.

**Rate limiting (по пользователю, после JWT):**

| Маршрут | Окно | Лимит |
|---------|------|--------|
| `POST /api/projects/:id/generate` | 1 мин | 15 |
| `POST /api/thumbnails/from-video` | 1 ч | 8 |

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
curl -s http://localhost:3001/
curl -s http://localhost:3001/api/health
curl -s -H "Authorization: Bearer <supabase_access_token>" http://localhost:3001/api/auth/me
```

Use Swagger at `/api/docs` for authenticated routes (`Authorize` with the same Bearer token).

## Deployment note

This app is a **long-running Node HTTP server** (`listen`). Host it on platforms meant for that (Railway, Render, Fly.io, Cloud Run, a VPS), not as a substitute for Vercel serverless functions. Set the same env vars in the host; point the frontend’s `NEXT_PUBLIC_BACKEND_URL` (or your Next rewrite target) at the deployed API origin.

## Monorepo

For full-stack setup (frontend env sync, Turborepo), see the root **`README.md`**.
