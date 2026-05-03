import {
  BadGatewayException,
  Body,
  Controller,
  Headers,
  Ip,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { SupportContactDto } from './dto/support-contact.dto';
import { TelegramTicketService } from './telegram-ticket.service';

function clientIpFromRequest(req: Request, fallback?: string): string | undefined {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0]?.trim() || undefined;
  }
  if (Array.isArray(xf) && xf[0]) {
    return String(xf[0]).split(',')[0]?.trim();
  }
  return fallback?.trim() || undefined;
}

@ApiTags('support')
@Controller(ApiControllerPaths.support)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 15 } })
export class SupportController {
  constructor(private readonly telegram: TelegramTicketService) {}

  /**
   * Public support contact (no JWT). Creates one Telegram message with email + message + metadata.
   */
  @Post('contact')
  async postContact(
    @Body() body: SupportContactDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (body.company?.trim()) {
      return { ok: true, skipped: true };
    }

    if (!this.telegram.isConfigured()) {
      throw new ServiceUnavailableException(
        'Support channel is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_SUPPORT_CHAT_ID.',
      );
    }

    const result = await this.telegram.sendTicket({
      email: body.email.trim(),
      message: body.message,
      name: body.name,
      source: body.source,
      pageUrl: body.page_url,
      clientIp: clientIpFromRequest(req, ip),
      userAgent,
    });

    if (!result.ok) {
      if (result.reason === 'not_configured') {
        throw new ServiceUnavailableException('Support channel is not configured.');
      }
      throw new BadGatewayException('Could not deliver message. Please try again later.');
    }

    return { ok: true };
  }
}
