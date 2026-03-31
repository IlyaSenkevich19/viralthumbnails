import { Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { getSupabaseAnon } from '../../lib/supabase-anon';

@Injectable()
export class SupabaseService {
  getAdminClient(): SupabaseClient {
    return getSupabaseAdmin();
  }

  getAnonClient(): SupabaseClient {
    return getSupabaseAnon();
  }
}
