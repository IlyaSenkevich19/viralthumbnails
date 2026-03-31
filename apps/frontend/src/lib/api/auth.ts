import { AppRoutes } from '@/config/routes';
import { createClient } from '@/lib/supabase/client';

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const {
    data: { url },
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}${AppRoutes.dashboard}`
          : undefined,
    },
  });
  if (error) throw error;
  if (url && typeof window !== 'undefined') {
    window.location.href = url;
  }
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}${AppRoutes.auth.updatePassword}`
      : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

