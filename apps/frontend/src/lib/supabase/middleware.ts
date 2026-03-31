import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { AppRoutes, isSessionPublicPath } from '@/config/routes';

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (set them in Vercel → Settings → Environment Variables).',
    );
    if (isSessionPublicPath(request.nextUrl.pathname)) {
      return { response, user: null };
    }
    const login = request.nextUrl.clone();
    login.pathname = AppRoutes.home;
    login.searchParams.set('error', 'configuration');
    return { response: NextResponse.redirect(login), user: null };
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isSessionPublicPath(request.nextUrl.pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = AppRoutes.home;
    return { response: NextResponse.redirect(loginUrl), user: null };
  }

  return { response, user };
}
