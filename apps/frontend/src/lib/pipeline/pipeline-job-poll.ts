/**
 * Client-side pipeline job status polling. Shared by dashboard mutations and
 * app-shell recovery so backoff behavior stays consistent and request volume
 * does not grow unbounded.
 */

/** First delay before/after the first few polls (ms). Slightly looser than 1.5s to cut API chatter. */
export const PIPELINE_JOB_POLL_BASE_MS = 2_000;

/** Upper bound for “normal” adaptive spacing (separate from 429 throttling). */
export const PIPELINE_JOB_POLL_MAX_MS = 8_000;

/**
 * Per-step growth; higher = fewer requests on long running/queued jobs.
 * Example: 2s → 2.4s → 2.8s → … up to cap by attempt ~12+.
 */
const PIPELINE_POLL_GROWTH = 1.18;

/**
 * @param attempt — zero-based index: time between mutation’s first sleep and first GET
 *   is `get(0)`; time before the 3rd GET is `get(2)`, etc.
 */
export function getPipelineJobPollWaitMs(attempt: number): number {
  if (attempt < 0) return PIPELINE_JOB_POLL_BASE_MS;
  const steps = Math.min(attempt, 16);
  const ms = Math.round(PIPELINE_JOB_POLL_BASE_MS * Math.pow(PIPELINE_POLL_GROWTH, steps));
  return Math.min(PIPELINE_JOB_POLL_MAX_MS, ms);
}

/** When {@link isApiError} and status 429, multiply current wait, capped here. */
export const PIPELINE_JOB_POLL_429_MAX_BACKOFF_MS = 10_000;

/** Stops an accidentally infinite poller; ~25min at min interval, longer with backoff. */
export const PIPELINE_JOB_MAX_POLL_ATTEMPTS = 200;
