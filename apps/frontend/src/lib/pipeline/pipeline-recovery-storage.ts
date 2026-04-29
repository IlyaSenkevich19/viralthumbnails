/**
 * localStorage keys for resuming thumbnail pipeline jobs after navigation/reload.
 * Kept in lib so hooks + App-level recovery can share the same source of truth.
 */
export const DASHBOARD_PIPELINE_RUN_RECOVERY_KEY = 'vt:dashboard:pipeline:run:active-job';
export const DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY = 'vt:dashboard:pipeline:video:active-job';
export const PIPELINE_JOB_RECOVERY_EVENT = 'vt:pipeline-job-recovery-change';

export function writePipelineRecoveryJob(key: string | undefined, jobId: string): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, jobId);
    window.dispatchEvent(new CustomEvent(PIPELINE_JOB_RECOVERY_EVENT));
  } catch {
    // Ignore storage failures; route-level polling can still continue.
  }
}

export function clearPipelineRecoveryJob(key: string | undefined): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(PIPELINE_JOB_RECOVERY_EVENT));
  } catch {
    // Ignore storage failures.
  }
}
