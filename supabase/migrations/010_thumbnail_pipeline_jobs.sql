-- Async job queue for thumbnail pipeline runs (Phase 4).

CREATE TABLE IF NOT EXISTS thumbnail_pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'succeeded', 'failed')
  ),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB,
  error_payload JSONB,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_thumbnail_pipeline_jobs_user_created
  ON thumbnail_pipeline_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thumbnail_pipeline_jobs_status_created
  ON thumbnail_pipeline_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_thumbnail_pipeline_jobs_running_lease
  ON thumbnail_pipeline_jobs(status, lease_expires_at)
  WHERE status = 'running';

ALTER TABLE thumbnail_pipeline_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thumbnail_pipeline_jobs_select_own" ON thumbnail_pipeline_jobs;
CREATE POLICY "thumbnail_pipeline_jobs_select_own" ON thumbnail_pipeline_jobs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "thumbnail_pipeline_jobs_insert_own" ON thumbnail_pipeline_jobs;
CREATE POLICY "thumbnail_pipeline_jobs_insert_own" ON thumbnail_pipeline_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "thumbnail_pipeline_jobs_update_own" ON thumbnail_pipeline_jobs;
CREATE POLICY "thumbnail_pipeline_jobs_update_own" ON thumbnail_pipeline_jobs
  FOR UPDATE USING (auth.uid() = user_id);

