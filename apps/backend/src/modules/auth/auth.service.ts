import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { LeadCrmWebhookService } from '../lead-crm/lead-crm-webhook.service';
import type { CompleteLeadQualificationDto } from './dto/complete-lead-qualification.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly leadCrm: LeadCrmWebhookService,
  ) {}

  async getBootstrap(userId: string) {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      return {
        id: userId,
        email: null as string | null,
        trialStarted: true,
        leadQualificationCompleted: true,
      };
    }
    const client = this.supabase.getAdminClient();

    const { data: authData, error: authErr } = await client.auth.admin.getUserById(userId);
    if (authErr) throw authErr;

    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('trial_started_at, lead_qualification_completed_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      this.logger.warn(
        `[auth/me] profiles select failed (${profileErr.message}) — returning permissive bootstrap. Run migration 013_lead_qualification_completed_at.sql if this persists.`,
      );
      return {
        id: authData.user.id,
        email: authData.user.email ?? null,
        trialStarted: true,
        leadQualificationCompleted: true,
      };
    }

    const row = profile as {
      trial_started_at?: string | null;
      lead_qualification_completed_at?: string | null;
    } | null;

    return {
      id: authData.user.id,
      email: authData.user.email ?? null,
      trialStarted: Boolean(row?.trial_started_at),
      leadQualificationCompleted: Boolean(row?.lead_qualification_completed_at),
    };
  }

  /**
   * In-app lead qualification: CRM via {@link LeadCrmWebhookService}, then `profiles.lead_qualification_completed_at`.
   */
  async completeLeadQualification(
    userId: string,
    dto: CompleteLeadQualificationDto,
    requestHost: string | undefined,
  ): Promise<{ ok: true; crmSkipped?: boolean }> {
    const url = this.config.get<string>('SUPABASE_URL')?.trim();
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (!url || !key) {
      throw new BadGatewayException('Auth service is not configured');
    }

    const client = this.supabase.getAdminClient();
    const { data: authData, error: authErr } = await client.auth.admin.getUserById(userId);
    if (authErr) throw authErr;

    const email = authData.user.email?.trim() ?? '';

    const result = await this.leadCrm.forwardLeadToSheets({
      dto,
      extras: {
        email: email || undefined,
        funnel_stage: 'post_app_qualification_completed',
      },
      requestHost,
      defaultPagePath: '/app',
      honeypot: 'reject',
    });

    if (result.kind === 'upstream_error') {
      throw new BadGatewayException(
        'Could not sync lead to CRM. Please try again in a moment or contact support.',
      );
    }

    const crmSkipped = result.kind === 'skipped' && result.reason === 'no_webhook_url';

    const completedAt = new Date().toISOString();
    const { error: upErr } = await client
      .from('profiles')
      .update({ lead_qualification_completed_at: completedAt })
      .eq('id', userId);

    if (upErr) {
      this.logger.error(`[lead-qualification] profile update failed: ${upErr.message}`);
      throw new BadGatewayException('Could not save qualification status. Try again.');
    }

    return { ok: true, crmSkipped };
  }
}
