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

export type ManualCreditApplyResult =
  | {
      ok: true;
      duplicate: false;
      pending: false;
      user_id: string;
      credited: number;
      new_balance: number;
      total_granted: number;
    }
  | {
      ok: true;
      duplicate: true;
      pending: false;
      user_id: string;
      credited: number;
      new_balance: number;
      total_granted: number;
    }
  | {
      ok: true;
      duplicate: boolean;
      pending: true;
      external_payment_id: string;
      email: string;
      credits: number;
      message: string;
    };

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

  private async ledgerHasManualPayment(client: ReturnType<SupabaseService['getAdminClient']>, ext: string) {
    const { data } = await client
      .from('credit_ledger')
      .select('user_id')
      .eq('reference_type', 'manual_external_payment')
      .eq('reference_id', ext)
      .limit(1)
      .maybeSingle();
    return data as { user_id: string } | null;
  }

  /**
   * Called from GET /auth/me: apply any rows in `pending_manual_credits` for this email.
   */
  async claimPendingForUser(userId: string, email: string): Promise<{ claimed: number; creditsTotal: number }> {
    const em = email.trim().toLowerCase();
    if (!em) return { claimed: 0, creditsTotal: 0 };

    const client = this.supabase.getAdminClient();
    const { data: rows, error } = await client
      .from('pending_manual_credits')
      .select('id, external_payment_id, credits, email, plan_code, source')
      .eq('status', 'pending')
      .eq('email', em);

    if (error) {
      this.logger.warn(`claimPendingForUser select: ${error.message}`);
      return { claimed: 0, creditsTotal: 0 };
    }

    let claimed = 0;
    let creditsTotal = 0;
    const now = new Date().toISOString();

    for (const row of rows ?? []) {
      const ext = String(row.external_payment_id);
      const led = await this.ledgerHasManualPayment(client, ext);
      if (led) {
        await client
          .from('pending_manual_credits')
          .update({ status: 'applied', user_id: userId, applied_at: now })
          .eq('id', row.id);
        continue;
      }

      try {
        await this.billing.grantManualExternalPaymentCredits({
          userId,
          credits: row.credits as number,
          externalPaymentId: ext,
          email: row.email as string,
          metadata: {
            plan_code: row.plan_code,
            source: row.source,
            from_pending_table: true,
          },
        });
        const { error: upErr } = await client
          .from('pending_manual_credits')
          .update({ status: 'applied', user_id: userId, applied_at: now })
          .eq('id', row.id);
        if (upErr) {
          this.logger.error(
            `pending_manual_credits update failed id=${row.id} after grant: ${upErr.message} — reconcile.`,
          );
        }
        claimed += 1;
        creditsTotal += row.credits as number;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`claimPendingForUser row ${row.id} ext=${ext}: ${msg}`);
      }
    }

    if (claimed > 0) {
      this.logger.log(`claimPendingForUser: applied ${claimed} pending row(s), +${creditsTotal} credits for ${em}`);
    }
    return { claimed, creditsTotal };
  }

  /**
   * Idempotent grant: if user exists → reserve `manual_credit_claims` → grant.
   * If no user → insert `pending_manual_credits` (same `external_payment_id` uniqueness).
   */
  async apply(dto: ManualCreditDto): Promise<ManualCreditApplyResult> {
    const client = this.supabase.getAdminClient();
    const ext = dto.external_payment_id.trim();
    const emailNorm = dto.email.trim().toLowerCase();

    const { data: ledRow } = await client
      .from('credit_ledger')
      .select('user_id, delta')
      .eq('reference_type', 'manual_external_payment')
      .eq('reference_id', ext)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ledRow?.user_id) {
      const credits = await this.billing.getGenerationCredits(ledRow.user_id as string);
      const credited = (ledRow.delta as number) > 0 ? (ledRow.delta as number) : dto.credits;
      return {
        ok: true,
        duplicate: true,
        pending: false,
        user_id: ledRow.user_id as string,
        credited,
        new_balance: credits.balance,
        total_granted: credits.totalGranted,
      };
    }

    const { data: existingClaim } = await client
      .from('manual_credit_claims')
      .select('user_id, credits_applied')
      .eq('external_payment_id', ext)
      .maybeSingle();

    if (existingClaim?.user_id != null && existingClaim.credits_applied != null) {
      const credits = await this.billing.getGenerationCredits(existingClaim.user_id as string);
      return {
        ok: true,
        duplicate: true,
        pending: false,
        user_id: existingClaim.user_id as string,
        credited: existingClaim.credits_applied as number,
        new_balance: credits.balance,
        total_granted: credits.totalGranted,
      };
    }

    const { data: existingPending } = await client
      .from('pending_manual_credits')
      .select('id, credits, email')
      .eq('external_payment_id', ext)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return {
        ok: true,
        duplicate: true,
        pending: true,
        external_payment_id: ext,
        email: existingPending.email as string,
        credits: existingPending.credits as number,
        message: 'Payment is queued until this email registers; duplicate notification ignored.',
      };
    }

    const { data: userIdRaw, error: rpcErr } = await client.rpc('lookup_auth_user_id_by_email', {
      p_email: emailNorm,
    });
    if (rpcErr) {
      this.logger.warn(`lookup_auth_user_id_by_email: ${rpcErr.message}`);
      throw new NotFoundException('Could not resolve user by email.');
    }
    const userId = typeof userIdRaw === 'string' ? userIdRaw : null;

    if (!userId) {
      const { error: pendErr } = await client.from('pending_manual_credits').insert({
        external_payment_id: ext,
        email: emailNorm,
        credits: dto.credits,
        plan_code: dto.plan_code?.trim() || null,
        source: dto.source?.trim() || null,
        status: 'pending',
      });
      if (pendErr) {
        const code = (pendErr as { code?: string }).code;
        if (code === '23505') {
          return {
            ok: true,
            duplicate: true,
            pending: true,
            external_payment_id: ext,
            email: emailNorm,
            credits: dto.credits,
            message: 'Pending row already exists for this payment id.',
          };
        }
        this.logger.warn(`pending_manual_credits insert: ${pendErr.message}`);
        throw new InternalServerErrorException(pendErr.message);
      }
      return {
        ok: true,
        duplicate: false,
        pending: true,
        external_payment_id: ext,
        email: emailNorm,
        credits: dto.credits,
        message: 'No account for this email yet; credits will apply when the user signs up with the same email.',
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
            pending: false,
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
        pending: false,
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
