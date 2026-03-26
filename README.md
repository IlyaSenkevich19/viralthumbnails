# Full-stack monorepo template

**Next.js** (App Router) + **Supabase Auth** + **NestJS** API, managed with **Turborepo** and **Yarn** workspaces.

## Layout

```
apps/frontend   — Next.js, protected routes via Supabase middleware
apps/backend    — NestJS, global prefix /api, Swagger at /api/docs
supabase/migrations — optional SQL (e.g. profiles table)
```

The frontend rewrites `/api/*` to the backend (`next.config.mjs`). Set **`NEXT_PUBLIC_BACKEND_URL`** in root `.env` (e.g. production API origin, no trailing slash). Defaults to `http://localhost:3001`.

## Quick start

1. **Node**: use `.nvmrc` (`nvm use`).

2. **Supabase**: create a project, enable Email (or other) auth. Optionally run `supabase/migrations/001_optional_profiles.sql` in the SQL Editor.

3. **Env**: `cp .env.example .env` and fill Supabase keys. `yarn dev` / `yarn build` sync `NEXT_PUBLIC_*` into `apps/frontend/.env.local` via `scripts/sync-frontend-env.js`.

Required auth-related variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. **Run** (from repo root):

```bash
yarn install
yarn dev
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001 — `GET /api/health`, `GET /api/auth/me` (Bearer JWT from Supabase)

## Auth flow

- Frontend sign-in/sign-up uses Supabase client auth in `apps/frontend/src/lib/api/auth.ts`.
- Frontend middleware in `apps/frontend/src/lib/supabase/middleware.ts` protects non-public routes.
- Backend validates Bearer JWT with Supabase in `apps/backend/src/modules/auth/guards/supabase.guard.ts`.
- Backend `GET /api/auth/me` reads user by id through Supabase Admin API in `apps/backend/src/modules/auth/auth.service.ts`.

## Troubleshooting

- Users not visible in Supabase Dashboard -> Authentication -> Users:
  - ensure `NEXT_PUBLIC_SUPABASE_URL` points to the same project you are checking;
  - ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set (the code does not read `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`);
  - restart `yarn dev` after env changes so `NEXT_PUBLIC_*` gets resynced to `apps/frontend/.env.local`.

## Where to extend

- **Backend**: register new modules in `apps/backend/src/app.module.ts`.
- **Frontend**: add routes under `apps/frontend/src/app`, API clients under `src/lib/api`, React Query hooks under `src/lib/queries`.
- **Branding**: set **`NEXT_PUBLIC_APP_NAME`** in `.env` (used for document title, sidebar, landing). Override in `src/config/site.ts` if you need more logic.

## License

MIT
