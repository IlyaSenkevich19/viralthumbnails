import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LeadIntakeFieldsDto } from './dto/lead-intake-fields.dto';

export type LeadCrmForwardResult =
  | { kind: 'sent' }
  | { kind: 'skipped'; reason: 'honeypot' | 'no_webhook_url' }
  | { kind: 'upstream_error'; status: number; preview: string };

@Injectable()
export class LeadCrmWebhookService {
  private readonly logger = new Logger(LeadCrmWebhookService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Single path to Google Apps Script CRM: validate honeypot (optional), enrich payload, POST webhook.
   */
  async forwardLeadToSheets(params: {
    dto: LeadIntakeFieldsDto;
    extras?: { email?: string; funnel_stage?: string };
    requestHost?: string;
    defaultPagePath: string;
    honeypot: 'reject' | 'skip_silently';
  }): Promise<LeadCrmForwardResult> {
    const company = params.dto.company?.trim();
    if (company) {
      if (params.honeypot === 'reject') {
        this.logger.warn('[lead-crm] honeypot hit — rejected');
        throw new BadRequestException('Invalid payload');
      }
      this.logger.warn('[lead-crm] honeypot hit — skipped');
      return { kind: 'skipped', reason: 'honeypot' };
    }

    const webhookUrl = this.config.get<string>('LEAD_INTAKE_WEBHOOK_URL')?.trim();
    const landing =
      params.requestHost?.trim() || this.config.get<string>('FRONTEND_URL')?.trim() || undefined;

    const base = this.buildPayloadRecord(params.dto, params.extras);
    const payload: Record<string, unknown> = {
      ...base,
      created_at: new Date().toISOString(),
      landing_domain: landing,
      page_path:
        typeof base.page_path === 'string' && String(base.page_path).trim()
          ? String(base.page_path).trim()
          : params.defaultPagePath,
    };

    if (!webhookUrl) {
      this.logger.warn(
        '[lead-crm] LEAD_INTAKE_WEBHOOK_URL is not set — skipping Google Apps Script forward.',
      );
      return { kind: 'skipped', reason: 'no_webhook_url' };
    }

    try {
      const upstream = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      const preview = (await upstream.clone().text().catch(() => '')).slice(0, 200);
      if (!upstream.ok) {
        if (upstream.status === 401 || upstream.status === 403) {
          this.logger.warn(
            '[lead-crm] CRM webhook 401/403 — Google Web App: Deploy → Web app → Who has access = Anyone (anonymous).',
          );
        }
        this.logger.warn(`[lead-crm] CRM webhook error ${upstream.status}: ${preview}`);
        return { kind: 'upstream_error', status: upstream.status, preview };
      }
      this.logger.log(`[lead-crm] CRM webhook OK (${upstream.status})`);
      return { kind: 'sent' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[lead-crm] CRM webhook unreachable: ${msg}`);
      return { kind: 'upstream_error', status: 0, preview: msg };
    }
  }

  private buildPayloadRecord(dto: LeadIntakeFieldsDto, extras?: { email?: string; funnel_stage?: string }) {
    const put = (out: Record<string, unknown>, key: string, val: string | undefined) => {
      const t = val?.trim();
      if (t) out[key] = t;
    };
    const p: Record<string, unknown> = {
      lead_session_id: dto.lead_session_id.trim(),
      channel_url: dto.channel_url.trim(),
    };
    put(p, 'biggest_thumbnail_problem', dto.biggest_thumbnail_problem);
    put(p, 'subscriber_count', dto.subscriber_count);
    put(p, 'videos_per_week', dto.videos_per_week);
    put(p, 'utm_source', dto.utm_source);
    put(p, 'utm_medium', dto.utm_medium);
    put(p, 'utm_campaign', dto.utm_campaign);
    put(p, 'utm_content', dto.utm_content);
    put(p, 'utm_term', dto.utm_term);
    put(p, 'gclid', dto.gclid);
    put(p, 'fbclid', dto.fbclid);
    put(p, 'referrer', dto.referrer);
    put(p, 'page_path', dto.page_path);
    put(p, 'source', dto.source);
    if (extras?.email?.trim()) p.email = extras.email.trim();
    if (extras?.funnel_stage?.trim()) p.funnel_stage = extras.funnel_stage.trim();
    return p;
  }
}
