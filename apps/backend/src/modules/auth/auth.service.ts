import { BadGatewayException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { LeadCrmWebhookService } from '../lead-crm/lead-crm-webhook.service';
import { ManualCreditService } from '../billing/manual-credit.service';
import type { CompleteLeadQualificationDto } from './dto/complete-lead-qualification.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly leadCrm: LeadCrmWebhookService,
    @Inject(forwardRef(() => ManualCreditService))
    private readonly manualCredit: ManualCreditService,
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
        pendingCreditsClaimed: 0,
      };
    }
    const client = this.supabase.getAdminClient();

    const { data: authData, error: authErr } = await client.auth.admin.getUserById(userId);
    if (authErr) throw authErr;

    let trialStarted = true;
    let leadQualificationCompleted = true;

    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('trial_started_at, lead_qualification_completed_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      this.logger.warn(
        `[auth/me] profiles select failed (${profileErr.message}) — returning permissive bootstrap. Run migration 013_lead_qualification_completed_at.sql if this persists.`,
      );
    } else if (profile) {
      const row = profile as {
        trial_started_at?: string | null;
        lead_qualification_completed_at?: string | null;
      };
      trialStarted = Boolean(row.trial_started_at);
      leadQualificationCompleted = Boolean(row.lead_qualification_completed_at);
    }

    const email = authData.user.email ?? null;
    let pendingCreditsClaimed = 0;
    if (email?.trim()) {
      try {
        const r = await this.manualCredit.claimPendingForUser(authData.user.id, email);
        pendingCreditsClaimed = r.creditsTotal;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`[auth/me] claimPendingForUser: ${msg}`);
      }
    }

    return {
      id: authData.user.id,
      email,
      trialStarted,
      leadQualificationCompleted,
      pendingCreditsClaimed,
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
