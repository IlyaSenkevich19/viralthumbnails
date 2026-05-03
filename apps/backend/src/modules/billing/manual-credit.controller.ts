import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ManualCreditDto } from './dto/manual-credit.dto';
import { ManualCreditService } from './manual-credit.service';

const SECRET_HEADER = 'x-manual-billing-secret';

/**
 * Public (no JWT): mediator / Apps Script / Zapier calls with shared secret.
 * Configure `MANUAL_BILLING_WEBHOOK_SECRET` in env; send same value in `X-Manual-Billing-Secret`.
 */
@ApiTags('billing')
@Controller(ApiControllerPaths.billing)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 30 } })
export class ManualCreditController {
  constructor(private readonly manualCredit: ManualCreditService) {}

  @Post('manual-credit')
  postManualCredit(
    @Body() body: ManualCreditDto,
    @Headers(SECRET_HEADER) secret?: string,
  ) {
    this.manualCredit.assertSecret(secret);
    return this.manualCredit.apply(body);
  }
}
