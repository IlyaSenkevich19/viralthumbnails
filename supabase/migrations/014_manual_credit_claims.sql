-- Idempotency + audit for mediator/manual payments (POST /api/billing/manual-credit).
-- Service role only for writes; no policies needed (RLS blocks anon/auth by default).

CREATE TABLE IF NOT EXISTS public.manual_credit_claims (
  external_payment_id text PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  credits_applied integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.manual_credit_claims IS 'One row per successful manual credit; PK prevents duplicate external_payment_id.';

CREATE INDEX IF NOT EXISTS idx_manual_credit_claims_user_created
  ON public.manual_credit_claims (user_id, created_at DESC);

ALTER TABLE public.manual_credit_claims ENABLE ROW LEVEL SECURITY;

-- Resolve auth user by email (backend service_role only).
CREATE OR REPLACE FUNCTION public.lookup_auth_user_id_by_email (p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email (text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email (text) TO service_role;
