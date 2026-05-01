import { AppRoutes } from '@/config/routes';
import { createClient } from '@/lib/supabase/client';

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export type SignUpLeadMetadata = {
  lead_session_id?: string;
  biggest_thumbnail_problem?: string;
  subscriber_count?: string;
  videos_per_week?: string;
  channel_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  page_path?: string;
  source?: string;
};

export async function signUp(email: string, password: string, metadata?: SignUpLeadMetadata) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
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
          ? `${window.location.origin}${AppRoutes.welcomeTrial}`
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

