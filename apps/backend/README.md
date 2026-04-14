# Backend (NestJS)

API for **ViralThumblify**: Supabase-backed projects, thumbnail variants, template catalog, and **OpenRouter**-powered thumbnail generation.

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

### OpenRouter: модели и сценарии

Все slug’и моделей — это идентификаторы на [OpenRouter](https://openrouter.ai/models); в коде они читаются из env в **`src/config/openrouter.config.ts`** (`getOpenRouterConfig`).

| Сценарий | Эндпоинт / этап | Переменная окружения | Дефолтная модель | Где в коде |
|----------|-----------------|----------------------|------------------|------------|
| Картинка для одного варианта проекта | `POST /api/projects/:id/generate` | `OPENROUTER_IMAGE_MODEL` | `google/gemini-2.5-flash-image-preview` | `project-variant-image.service.ts` |
| Анализ видео (описание кадров, стиль) | `POST /api/thumbnails/from-video`, шаг analyze | `OPENROUTER_VIDEO_MODEL` | `google/gemini-2.0-flash-001` | `video-analysis.service.ts` |
| Генерация N кандидатов превью по анализу | тот же пайплайн, шаг generate | `OPENROUTER_IMAGE_MODEL` | как выше | `thumbnail-generation.service.ts` |
| Скоринг и ранжирование кандидатов | тот же пайплайн, шаг rank | `OPENROUTER_RANKING_MODEL` *(если пусто — берётся `OPENROUTER_VIDEO_MODEL`)* | fallback = video-модель | `thumbnail-ranking.service.ts` |
| Модульный пайплайн | `POST /api/thumbnails/pipeline/run` | Все slug’и шагов в **`thumbnail-pipeline/config/pipeline-step-models.ts`** (VL: gemma free + nemotron fallback; image: `flux.2-flex` / edit: `flux.2-pro`) | `thumbnail-pipeline/*` | `thumbnail-pipeline-orchestrator.service.ts` |

Без **`OPENROUTER_API_KEY`** генерация вариантов проекта всё равно отрабатывает, но сохраняет **placeholder**-URL картинки. Пайплайн **`from-video`** для реальных вызовов к моделям тоже ожидает ключ.

#### OpenRouter: остальные переменные

Парсинг и дефолты — в **`openrouter.config.ts`**.

| Variable | Role |
|----------|------|
| `OPENROUTER_API_KEY` | Доступ к API OpenRouter |
| `OPENROUTER_USE_FREE_MODELS` | `1` / `true`: дефолты для **анализа видео** и **ранжирования** → `openrouter/free` (если не заданы `OPENROUTER_VIDEO_MODEL` / `OPENROUTER_RANKING_MODEL`). Генерация **картинок** превью по-прежнему через платную image-модель. |
| `OPENROUTER_IMAGE_MODEL` | См. таблицу выше (проект + картинки в `from-video`) |
| `OPENROUTER_PROJECT_GEN_TIMEOUT_MS` | Таймаут HTTP для **одного** вызова картинки варианта проекта (мс) |
| `OPENROUTER_VIDEO_MODEL` | См. таблицу выше (анализ видео; fallback для ранжирования) |
| `OPENROUTER_RANKING_MODEL` | Отдельная модель для ранжирования (опционально) |
| `OPENROUTER_BASE_URL` | База API (дефолт в конфиге) |
| `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | Заголовки запросов к OpenRouter |

```env
OPENROUTER_API_KEY=
# OPENROUTER_USE_FREE_MODELS=1
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
# OPENROUTER_HTTP_REFERER=https://your-frontend.example
# OPENROUTER_APP_TITLE=ViralThumblify
OPENROUTER_IMAGE_MODEL=google/gemini-2.5-flash-image-preview
OPENROUTER_PROJECT_GEN_TIMEOUT_MS=120000
OPENROUTER_VIDEO_MODEL=google/gemini-2.0-flash-001
# OPENROUTER_RANKING_MODEL=google/gemini-2.0-flash-001
```

`POST /api/thumbnails/from-video` (Bearer, `multipart/form-data`): field `file` **or** `videoUrl`, optional `count` (1–12), `style`. Temp uploads live under `{userId}/from-video/temp/…`, outputs under `{userId}/from-video/out/{runId}/…`.

`POST /api/thumbnails/pipeline/run` (Bearer, JSON): модульный OpenRouter-пайплайн для MVP и тестов. Поля: `user_prompt` (обязательно), опционально `video_url` (уже разрешённый HTTPS URL после загрузки или прямая ссылка), `template_reference_data_urls`, `face_reference_data_urls` (`data:image/...;base64,...`), `variant_count`, `generate_images`, `prioritize_face`, `base_image_data_url` + `edit_instruction` для слоя редактирования. Ответ: структурированный `analysis`, `image_prompts_used`, `models_used`, при `generate_images: true` — `variants[].image_base64`. Модели шагов (VL, Flux gen/edit) задаются в **`src/modules/thumbnail-pipeline/config/pipeline-step-models.ts`** (не через env). **Кредиты пока не списываются** — перед публичным доступом подключите биллинг.

**Кредиты для `from-video`:** списывается **`1 + 2×count`** (один вызов анализа видео + `count` генераций изображений + `count` ранжирований). При ошибке пайплайна после резерва баланс возвращается.

**Rate limiting (по пользователю, после JWT):**

| Маршрут | Окно | Лимит |
|---------|------|--------|
| `POST /api/projects/:id/generate` | 1 мин | 15 |
| `POST /api/thumbnails/from-video` | 1 ч | 8 |
| `POST /api/thumbnails/pipeline/run` | 1 ч | 8 |

### Optional — Storage signed URLs

```env
SUPABASE_STORAGE_SIGN_EXPIRES_SEC=3600
```

## Database & Storage

SQL migrations live in the monorepo: **`supabase/migrations/`**. Apply them in the Supabase SQL Editor or via Supabase CLI so tables (`projects`, `thumbnail_variants`, `thumbnail_templates`, `profiles`, …) and Storage policies exist before calling the API.

### `profiles` and generation credits

- **`001`** creates `public.profiles`; **`003_generation_credits.sql`** adds `generation_credits_balance`; **`008_credit_ledger_and_credit_model_cleanup.sql`** adds `generation_credits_total_granted` + `credit_ledger` (defaults **3**).
- New users only appear in **`auth.users`** until a matching **`profiles`** row exists. **`007_profiles_auto_create.sql`** defines **`handle_new_user`** on **`AFTER INSERT ON auth.users`** and **backfills** any existing auth users without a profile.
- If you skipped **007**, the API used to error with *“No profile row for this account”* on reserve credits. The backend now **lazy-inserts** a `profiles` row via the service role when needed, but you should still run **007** in production so the DB stays consistent and triggers work for all new signups.

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
