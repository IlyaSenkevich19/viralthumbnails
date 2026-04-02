-- Ensure every auth user has a public.profiles row (billing, credits, RLS).
-- Prerequisite: migrations 001 (profiles table) and 003_generation_credits.sql applied.
-- Without this, new signups only exist in auth.users and credit reservation fails.
--
-- If `EXECUTE PROCEDURE` errors on your Postgres version, use:
--   EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Inserts public.profiles when a new auth.users row is created';

-- ---------------------------------------------------------------------------
-- Backfill: existing users who registered before this migration
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id)
SELECT u.id
FROM auth.users AS u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = u.id);
