import { type NextRequest, NextResponse } from 'next/server';
import { AppRoutes } from '@/config/routes';
import { updateSession } from '@/lib/supabase/middleware';

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function middleware(request: NextRequest) {
  try {
    const { response: sessionResponse, user } = await updateSession(request);
    const path = request.nextUrl.pathname;

    if (path === AppRoutes.home) {
      if (user) {
        const url = request.nextUrl.clone();
        url.pathname = AppRoutes.dashboard;
        const redirect = NextResponse.redirect(url);
        copyCookies(sessionResponse, redirect);
        return redirect;
      }
      return sessionResponse;
    }

    if (path === AppRoutes.projectsNew) {
      if (sessionResponse.status >= 300) {
        return sessionResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = AppRoutes.dashboard;
      const redirect = NextResponse.redirect(url);
      copyCookies(sessionResponse, redirect);
      return redirect;
    }

    return sessionResponse;
  } catch (err) {
    console.error('[middleware]', err);
    return NextResponse.next({ request });
  }
}

export const config = {
  // Skip /api/* so rewrites to the Nest backend are not processed here (avoids Edge failures + wrong redirects on JSON fetches).
  matcher: [
    '/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
