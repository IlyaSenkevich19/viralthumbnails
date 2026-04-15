/** Per authenticated user (`SupabaseGuard` must run before the throttler guard). */

/** `POST /projects/:id/generate` — many cheap-ish image calls; limit burst per minute */
export const THROTTLE_PROJECT_GENERATE = { limit: 15, ttl: 60_000 } as const;

/** `POST /thumbnails/pipeline/run*` — heavy pipeline; fewer runs per hour */
export const THROTTLE_VIDEO_FROM = { limit: 8, ttl: 3_600_000 } as const;
