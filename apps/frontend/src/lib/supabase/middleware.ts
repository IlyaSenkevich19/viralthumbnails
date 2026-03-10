import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/auth/login') ||
    request.nextUrl.pathname.startsWith('/auth/register');

  if (!isPublicRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === '/dashboard') {
    const [
      { count: projectsCount },
      { count: campaignsCount },
    ] = await Promise.all([
      supabase.from('projects').select('id', { head: true, count: 'exact' }),
      supabase.from('campaigns').select('id', { head: true, count: 'exact' }),
    ]);
    const hasProjects = (projectsCount ?? 0) > 0;
    const hasCampaigns = (campaignsCount ?? 0) > 0;
    if (!hasProjects && !hasCampaigns) {
      const url = request.nextUrl.clone();
      url.pathname = '/new-project/website';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
