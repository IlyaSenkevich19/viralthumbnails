import { Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

/**
 * Injectable wrapper around the Supabase service-role client for server-side DB access.
 */
@Injectable()
export class SupabaseService {
  getAdminClient(): SupabaseClient {
    return getSupabaseAdmin();
  }
}
