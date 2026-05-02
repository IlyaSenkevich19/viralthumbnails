import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async getBootstrap(userId: string) {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      return { id: userId, email: null as string | null, trialStarted: true };
    }
    const client = this.supabase.getAdminClient();

    const { data: authData, error: authErr } = await client.auth.admin.getUserById(userId);
    if (authErr) throw authErr;

    const { data: profile } = await client
      .from('profiles')
      .select('trial_started_at')
      .eq('id', userId)
      .maybeSingle();

    return {
      id: authData.user.id,
      email: authData.user.email ?? null,
      trialStarted: Boolean(profile?.trial_started_at),
    };
  }
}
