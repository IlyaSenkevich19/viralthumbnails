import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { AppRoutes } from '@/config/routes';
import { getSupabasePublicEnv } from '@/lib/supabase/public-env';

export const dynamic = 'force-dynamic';

/**
 * Full navigation to this route clears cookies on the redirect response so middleware stops
 * treating the user as logged in immediately (matches server session).
 */
export async function GET(request: NextRequest) {
  const { url: supabaseUrl, anonKey } = getSupabasePublicEnv();

  const response = NextResponse.redirect(new URL(AppRoutes.home, request.url));

  /** Compatible with Next `ResponseCookies.set` third argument (matches what Supabase passes). */
  type CookieSetOpts = Parameters<typeof response.cookies.set>[2];

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(rows: Array<{ name: string; value: string; options?: CookieSetOpts }>) {
        for (const { name, value, options } of rows) {
          if (options === undefined) {
            response.cookies.set(name, value);
          } else {
            response.cookies.set(name, value, options);
          }
        }
      },
    },
  });

  await supabase.auth.signOut();

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
