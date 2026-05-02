import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { AppRoutes } from '@/config/routes';
import { createClient } from '@/lib/supabase/server';

const RECOVERY_NEXT_DEFAULT = AppRoutes.auth.updatePassword;

function safeAuthNext(raw: string | null): string {
  if (raw == null || raw.trim() === '') return RECOVERY_NEXT_DEFAULT;
  const path = raw.split(/[?#]/)[0]?.trim();
  if (!path || path.startsWith('//')) return RECOVERY_NEXT_DEFAULT;
  if (!path.startsWith('/')) return RECOVERY_NEXT_DEFAULT;
  if (!path.startsWith('/auth/')) return RECOVERY_NEXT_DEFAULT;
  return path.split(' ')[0] ?? RECOVERY_NEXT_DEFAULT;
}

/**
 * Supabase email links with OTP params (`token_hash` + `type`). Sets auth cookies via SSR.
 *
 * Dashboard → Authentication → Email templates → Reset password: point confirmation URL here, for example:
 * `{Site URL}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`
 */
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const typeParam = request.nextUrl.searchParams.get('type');
  const type = typeof typeParam === 'string' && typeParam.trim().length > 0 ? typeParam.trim() : null;
  const nextPath = safeAuthNext(request.nextUrl.searchParams.get('next'));

  if (!token_hash || !type) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = AppRoutes.home;
    redirect.search = '';
    redirect.hash = '';
    redirect.searchParams.set('auth_error', 'invalid_recovery_link');
    return NextResponse.redirect(redirect);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as EmailOtpType,
  });

  if (error) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = AppRoutes.home;
    redirect.search = '';
    redirect.hash = '';
    redirect.searchParams.set('auth_error', 'recovery_failed');
    return NextResponse.redirect(redirect);
  }

  const redirect = request.nextUrl.clone();
  redirect.pathname = nextPath;
  redirect.search = '';
  redirect.hash = '';
  return NextResponse.redirect(redirect);
}
