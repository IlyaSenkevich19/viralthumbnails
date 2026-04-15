/** HTTP listen port when `process.env.PORT` is unset (local dev). PaaS often injects `PORT` without `.env`. */
export const DEFAULT_SERVER_LISTEN_PORT = 3001;

export function resolveListenPort(): number {
  const env = Number(process.env.PORT);
  if (Number.isFinite(env) && env > 0) return env;
  return DEFAULT_SERVER_LISTEN_PORT;
}

/** Supabase Storage signed URL TTL (seconds). */
export const DEFAULT_SUPABASE_STORAGE_SIGN_EXPIRES_SEC = 3600;
