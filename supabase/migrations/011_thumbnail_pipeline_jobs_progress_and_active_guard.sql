ALTER TABLE thumbnail_pipeline_jobs
  ADD COLUMN IF NOT EXISTS progress_payload JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_thumbnail_pipeline_jobs_one_active_per_user
  ON thumbnail_pipeline_jobs(user_id)
  WHERE status IN ('queued', 'running');

