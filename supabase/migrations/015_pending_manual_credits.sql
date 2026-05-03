-- Payments received before the buyer had a Supabase auth user (mediator / email flow).

CREATE TABLE IF NOT EXISTS public.pending_manual_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  external_payment_id text NOT NULL,
  email text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  plan_code text,
  source text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_manual_credits_external_payment_id_key UNIQUE (external_payment_id)
);

COMMENT ON TABLE public.pending_manual_credits IS 'Mediator payments waiting for auth user with same email; applied on /auth/me claim.';

CREATE INDEX IF NOT EXISTS idx_pending_manual_credits_email_pending
  ON public.pending_manual_credits (email)
  WHERE status = 'pending';

ALTER TABLE public.pending_manual_credits ENABLE ROW LEVEL SECURITY;
