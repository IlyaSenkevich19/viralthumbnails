-- Subscription / trial: image generation credits (balance vs plan quota)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS generation_credits_balance INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS generation_credits_quota INTEGER NOT NULL DEFAULT 3;

COMMENT ON COLUMN profiles.generation_credits_balance IS 'Remaining generations the user can run';
COMMENT ON COLUMN profiles.generation_credits_quota IS 'Included generations for current plan / trial (for display)';
