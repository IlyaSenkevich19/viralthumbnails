import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Singleton anon-key client for JWT verification (`auth.getUser`) and public-scoped calls.
 * Mirrors {@link getSupabaseAdmin}; uses the same env loading as the rest of the process.
 */
export function getSupabaseAnon(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
