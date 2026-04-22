/**
 * localStorage keys for resuming thumbnail pipeline jobs after navigation/reload.
 * Kept in lib so hooks + App-level recovery can share the same source of truth.
 */
export const DASHBOARD_PIPELINE_RUN_RECOVERY_KEY = 'vt:dashboard:pipeline:run:active-job';
export const DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY = 'vt:dashboard:pipeline:video:active-job';
