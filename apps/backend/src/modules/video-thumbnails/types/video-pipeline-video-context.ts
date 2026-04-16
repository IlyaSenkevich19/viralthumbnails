/** How server-side duration was obtained (Phase 1 metadata). */
export type PipelineVideoDurationResolution = 'ffprobe_upload' | 'youtube_data_api' | 'unavailable';

/**
 * Persisted and returned on pipeline runs that include video — duration probe + policy window.
 * Phase 1: `analyzed_window` is the full source when under max length (same as source when duration known).
 */
export type PipelineVideoContext = {
  duration_seconds: number | null;
  duration_resolution: PipelineVideoDurationResolution;
  max_duration_seconds: number;
  analyzed_window: { start_sec: number; end_sec: number | null };
};
