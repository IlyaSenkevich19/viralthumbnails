import { BadGatewayException, Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ApiTags } from '@nestjs/swagger';
import { PublicLeadIntakeDto } from './dto/public-lead-intake.dto';
import { LeadCrmWebhookService } from './lead-crm-webhook.service';

@ApiTags('leads')
@Controller(ApiControllerPaths.leads)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 40 } })
export class LeadsController {
  constructor(private readonly leadCrm: LeadCrmWebhookService) {}

  /**
   * Public CRM intake (no auth). Browser → Next `/api/*` rewrite → Nest → Google Apps Script.
   * Do not call the webhook URL from the client directly — keeps URL server-side and matches Sheets contract.
   */
  @Post('intake')
  async postIntake(@Body() body: PublicLeadIntakeDto, @Headers('host') host?: string) {
    const funnel = body.funnel_stage?.trim() || 'public_lead_intake';
    const result = await this.leadCrm.forwardLeadToSheets({
      dto: body,
      extras: {
        email: body.email?.trim(),
        funnel_stage: funnel,
      },
      requestHost: host,
      defaultPagePath: '/api/leads/intake',
      honeypot: 'skip_silently',
    });

    if (result.kind === 'skipped') {
      return {
        ok: true,
        skipped: true,
        skippedReason: result.reason,
      };
    }
    if (result.kind === 'upstream_error') {
      throw new BadGatewayException('CRM webhook rejected the request or is unreachable.');
    }
    return { ok: true };
  }
}
