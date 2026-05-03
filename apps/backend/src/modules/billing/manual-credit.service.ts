import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { BillingService } from './billing.service';
import type { ManualCreditDto } from './dto/manual-credit.dto';

@Injectable()
export class ManualCreditService {
  private readonly logger = new Logger(ManualCreditService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly billing: BillingService,
  ) {}

  assertSecret(headerSecret: string | undefined): void {
    const expected = this.config.get<string>('MANUAL_BILLING_WEBHOOK_SECRET')?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'MANUAL_BILLING_WEBHOOK_SECRET is not configured on the server.',
      );
    }
    if (!headerSecret || headerSecret.trim() !== expected) {
      throw new UnauthorizedException('Invalid or missing billing secret.');
    }
  }

  /**
   * Idempotent grant: reserve row by external_payment_id → grant credits → complete row.
   */
  async apply(dto: ManualCreditDto): Promise<
    | { ok: true; duplicate: false; user_id: string; credited: number; new_balance: number; total_granted: number }
    | { ok: true; duplicate: true; user_id: string; credited: number; new_balance: number; total_granted: number }
  > {
    const client = this.supabase.getAdminClient();
    const ext = dto.external_payment_id.trim();
    const email = dto.email.trim().toLowerCase();

    const { data: existing } = await client
      .from('manual_credit_claims')
      .select('user_id, credits_applied')
      .eq('external_payment_id', ext)
      .maybeSingle();

    if (existing?.user_id != null && existing.credits_applied != null) {
      const credits = await this.billing.getGenerationCredits(existing.user_id as string);
      return {
        ok: true,
        duplicate: true,
        user_id: existing.user_id as string,
        credited: existing.credits_applied as number,
        new_balance: credits.balance,
        total_granted: credits.totalGranted,
      };
    }

    const { error: reserveErr } = await client.from('manual_credit_claims').insert({
      external_payment_id: ext,
      email: dto.email.trim(),
    });
    if (reserveErr) {
      const code = (reserveErr as { code?: string }).code;
      if (code === '23505') {
        const { data: row } = await client
          .from('manual_credit_claims')
          .select('user_id, credits_applied')
          .eq('external_payment_id', ext)
          .maybeSingle();
        if (row?.user_id != null && row.credits_applied != null) {
          const credits = await this.billing.getGenerationCredits(row.user_id as string);
          return {
            ok: true,
            duplicate: true,
            user_id: row.user_id as string,
            credited: row.credits_applied as number,
            new_balance: credits.balance,
            total_granted: credits.totalGranted,
          };
        }
        throw new ConflictException('Payment id is being processed; retry shortly.');
      }
      this.logger.warn(`manual_credit reserve failed: ${reserveErr.message}`);
      throw new InternalServerErrorException(reserveErr.message);
    }

    const { data: userIdRaw, error: rpcErr } = await client.rpc('lookup_auth_user_id_by_email', {
      p_email: email,
    });
    if (rpcErr) {
      await client.from('manual_credit_claims').delete().eq('external_payment_id', ext);
      this.logger.warn(`lookup_auth_user_id_by_email: ${rpcErr.message}`);
      throw new NotFoundException('Could not resolve user by email.');
    }
    const userId = typeof userIdRaw === 'string' ? userIdRaw : null;
    if (!userId) {
      await client.from('manual_credit_claims').delete().eq('external_payment_id', ext);
      throw new NotFoundException(`No Supabase user for email: ${dto.email.trim()}`);
    }

    try {
      const { newBalance, totalGranted } = await this.billing.grantManualExternalPaymentCredits({
        userId,
        credits: dto.credits,
        externalPaymentId: ext,
        email: dto.email.trim(),
        metadata: {
          plan_code: dto.plan_code,
          source: dto.source ?? 'manual_mediator_mvp',
        },
      });

      const { error: upErr } = await client
        .from('manual_credit_claims')
        .update({
          user_id: userId,
          credits_applied: dto.credits,
        })
        .eq('external_payment_id', ext);
      if (upErr) {
        this.logger.error(
          `manual_credit claim update failed after grant ext=${ext}: ${upErr.message} — reconcile ledger vs claim row.`,
        );
      }

      return {
        ok: true,
        duplicate: false,
        user_id: userId,
        credited: dto.credits,
        new_balance: newBalance,
        total_granted: totalGranted,
      };
    } catch (e) {
      await client.from('manual_credit_claims').delete().eq('external_payment_id', ext);
      throw e;
    }
  }
}
