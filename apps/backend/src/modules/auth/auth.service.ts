import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async getUser(userId: string) {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      return { id: userId };
    }
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  }
}
