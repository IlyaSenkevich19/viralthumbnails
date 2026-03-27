import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const sessionResponse = await updateSession(request);

    if (request.nextUrl.pathname !== '/projects/new') {
      return sessionResponse;
    }

    if (sessionResponse.status >= 300) {
      return sessionResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('openNewProject', '1');

    const redirect = NextResponse.redirect(url);
    sessionResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });

    return redirect;
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
