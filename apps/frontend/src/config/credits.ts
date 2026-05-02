/** Used when no `profiles` row exists yet (same as DB default for new trials). */
export const DEFAULT_TRIAL_GENERATION_CREDITS = 3;

/** First batch size after project create (dashboard + new project); backend caps at 5 per request. */
export const DEFAULT_NEW_PROJECT_VARIANT_COUNT = 3;

/** Credits charged for AI refine of one finished thumbnail (matches backend `thumbnail_variant_refine`). */
export const VARIANT_REFINE_CREDIT_COST = 1;
