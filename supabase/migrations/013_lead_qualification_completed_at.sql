-- Gate: after signup (any method), user completes in-app lead qualification before trial welcome.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lead_qualification_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.lead_qualification_completed_at IS
  'When the user finished in-app lead qualification (CRM intake). NULL = must show qualification.';

-- Existing users already onboarded: do not block them with the new modal.
UPDATE public.profiles
SET lead_qualification_completed_at = COALESCE(lead_qualification_completed_at, now())
WHERE lead_qualification_completed_at IS NULL;
