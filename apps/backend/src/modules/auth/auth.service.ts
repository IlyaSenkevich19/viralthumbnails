import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabaseAdmin: SupabaseClient | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      this.supabaseAdmin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  async getUser(userId: string) {
    if (!this.supabaseAdmin) {
      return { id: userId };
    }
    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  }
}
