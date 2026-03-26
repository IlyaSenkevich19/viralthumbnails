# Backend

NestJS API for the template monorepo.

## Stack

- NestJS 10
- Supabase JS client
- Swagger (`/api/docs`)

## What is included

- `GET /api/health` - healthcheck endpoint
- `GET /api/auth/me` - returns current user from Supabase (requires Bearer JWT)
- Global prefix `api`
- Global validation pipe
- CORS support via `FRONTEND_URL`

## Environment variables

Required:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Optional:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

Notes:

- `SUPABASE_ANON_KEY` is used by the auth guard to validate incoming JWTs.
- `SUPABASE_SERVICE_ROLE_KEY` is used by `GET /api/auth/me` to read user data through Admin API.

## Run

From repo root:

```bash
yarn dev:backend
```

Directly in this package:

```bash
yarn dev
```

## Build

```bash
yarn build
yarn start:prod
```

## Request example

```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:3001/api/auth/me
```

For full monorepo setup, see root `README.md`.
