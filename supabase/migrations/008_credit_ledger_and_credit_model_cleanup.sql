-- Credit-pack model cleanup + ledger
-- 1) Remove legacy `is_pro` flag (subscription-era artifact)
-- 2) Rename quota semantics to `generation_credits_total_granted`
-- 3) Add immutable credit ledger for audit/history

-- ---------------------------------------------------------------------------
-- profiles cleanup
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  DROP COLUMN IF EXISTS is_pro;

-- Keep old column for backward compatibility while migrating data.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS generation_credits_total_granted INTEGER NOT NULL DEFAULT 3;

-- Backfill from old quota where present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'generation_credits_quota'
  ) THEN
    UPDATE profiles
    SET generation_credits_total_granted = generation_credits_quota
    WHERE generation_credits_total_granted IS NULL
       OR generation_credits_total_granted = 3;
  END IF;
END $$;

COMMENT ON COLUMN profiles.generation_credits_balance IS 'Current remaining generation credits';
COMMENT ON COLUMN profiles.generation_credits_total_granted IS 'Total credits granted to user (trial + purchased + manual adjustments)';

-- ---------------------------------------------------------------------------
-- credit_ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('trial_grant', 'purchase', 'reserve', 'refund', 'manual_adjustment')
  ),
  reference_type TEXT,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created
  ON credit_ledger(user_id, created_at DESC);

ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_ledger_select_own" ON credit_ledger;
CREATE POLICY "credit_ledger_select_own" ON credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- No direct insert/update/delete from client role; only backend service role writes.

