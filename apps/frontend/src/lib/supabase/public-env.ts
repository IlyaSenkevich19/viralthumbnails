/**
 * Browser and server Supabase client config (NEXT_PUBLIC_* are inlined at `next build`).
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both in your host (Vercel: Project → Settings → Environment Variables), apply to Production, then Redeploy — Next embeds NEXT_PUBLIC_* at build time.',
    );
  }
  return { url, anonKey };
}
