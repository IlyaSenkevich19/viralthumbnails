import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type TelegramTicketSendResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'telegram_error'; detail?: string };

@Injectable()
export class TelegramTicketService {
  private readonly logger = new Logger(TelegramTicketService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    const chatId = this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID')?.trim();
    return Boolean(token && chatId);
  }

  /**
   * Sends one HTML message to the configured Telegram chat (group/channel).
   * https://core.telegram.org/bots/api#sendmessage
   */
  async sendTicket(params: {
    email: string;
    message: string;
    name?: string;
    source: 'landing' | 'app';
    pageUrl?: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<TelegramTicketSendResult> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    const chatId = this.config.get<string>('TELEGRAM_SUPPORT_CHAT_ID')?.trim();
    if (!token || !chatId) {
      this.logger.warn('[support] TELEGRAM_BOT_TOKEN or TELEGRAM_SUPPORT_CHAT_ID missing — skip send');
      return { ok: false, reason: 'not_configured' };
    }

    const e = escapeTelegramHtml;
    const lines: string[] = [
      `<b>Support ticket</b>`,
      `<b>Source:</b> ${e(params.source)}`,
      `<b>Email:</b> ${e(params.email)}`,
    ];
    if (params.name?.trim()) {
      lines.push(`<b>Name:</b> ${e(params.name.trim())}`);
    }
    if (params.pageUrl?.trim()) {
      lines.push(`<b>Page:</b> ${e(params.pageUrl.trim())}`);
    }
    if (params.clientIp?.trim()) {
      lines.push(`<b>IP:</b> ${e(params.clientIp.trim())}`);
    }
    if (params.userAgent?.trim()) {
      const ua = params.userAgent.trim().slice(0, 500);
      lines.push(`<b>UA:</b> ${e(ua)}`);
    }
    lines.push('');
    lines.push(`<b>Message</b>`);
    lines.push(`<pre>${e(params.message.trim())}</pre>`);

    let text = lines.join('\n');
    if (text.length > 4090) {
      text = text.slice(0, 4080) + '\n…';
    }

    const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.text().catch(() => '');
      if (!res.ok) {
        this.logger.warn(`[support] Telegram sendMessage ${res.status}: ${body.slice(0, 300)}`);
        return { ok: false, reason: 'telegram_error', detail: body.slice(0, 200) };
      }
      this.logger.log('[support] Telegram ticket sent');
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[support] Telegram unreachable: ${msg}`);
      return { ok: false, reason: 'telegram_error', detail: msg };
    }
  }
}
