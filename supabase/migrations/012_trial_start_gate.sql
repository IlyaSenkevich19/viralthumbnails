-- One-time trial activation gate.
-- Existing users are backfilled as already started so they are not interrupted.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

UPDATE profiles
SET trial_started_at = COALESCE(trial_started_at, created_at, NOW())
WHERE trial_started_at IS NULL;

COMMENT ON COLUMN profiles.trial_started_at IS 'When the user acknowledged and started the free credit trial.';
