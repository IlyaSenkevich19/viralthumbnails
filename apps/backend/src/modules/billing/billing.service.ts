import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const DEFAULT_CREDITS = { balance: 3, totalGranted: 3 };
const RESERVE_RETRY = 8;

export function creditsForThumbnailPipelineRun(params: {
  variantCount: number;
  generateImages: boolean;
  includeImageEdit: boolean;
}): number {
  const n = Math.min(12, Math.max(1, Math.floor(params.variantCount)));
  let cost = 1;
  if (params.generateImages) cost += n;
  if (params.includeImageEdit) cost += 1;
  return Math.max(1, cost);
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async appendCreditLedgerEntry(params: {
    userId: string;
    delta: number;
    balanceAfter: number;
    reason: 'trial_grant' | 'purchase' | 'reserve' | 'refund' | 'manual_adjustment';
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { error } = await client.from('credit_ledger').insert({
      user_id: params.userId,
      delta: params.delta,
      balance_after: params.balanceAfter,
      reason: params.reason,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) {
      this.logger.warn(`credit_ledger insert failed: ${error.message}`);
    }
  }

  /** @see creditsForThumbnailPipelineRun */
  thumbnailPipelineCreditCost(params: {
    variantCount: number;
    generateImages: boolean;
    includeImageEdit: boolean;
  }): number {
    return creditsForThumbnailPipelineRun(params);
  }

  private async ensureProfileRow(userId: string): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { data: existing, error: selErr } = await client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (selErr) throw new InternalServerErrorException(selErr.message);
    if (existing) return;

    const { error: insErr } = await client.from('profiles').insert({ id: userId });
    if (!insErr) return;

    const code = (insErr as { code?: string }).code;
    const msg = (insErr.message ?? '').toLowerCase();
    if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return;
    }
    this.logger.warn(`ensureProfileRow insert failed for ${userId}: ${insErr.message}`);
    throw new InternalServerErrorException(insErr.message);
  }

  async reserveGenerationCredits(
    userId: string,
    amount: number,
    context?: { referenceType?: string; referenceId?: string },
  ): Promise<void> {
    if (amount <= 0) return;
    await this.ensureProfileRow(userId);
    const client = this.supabase.getAdminClient();

    for (let attempt = 0; attempt < RESERVE_RETRY; attempt++) {
      const { data: row, error: selErr } = await client
        .from('profiles')
        .select('generation_credits_balance')
        .eq('id', userId)
        .maybeSingle();
      if (selErr) throw new InternalServerErrorException(selErr.message);
      if (!row) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_CREDITS',
          message:
            'Profile row is still missing after create. Run Supabase migration 007_profiles_auto_create.sql (trigger + backfill) or check the profiles table.',
        });
      }
      const bal = row.generation_credits_balance as number;
      if (bal < amount) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_CREDITS',
          message: `Not enough generation credits (need ${amount}, have ${bal}).`,
        });
      }
      const { data: updated, error: upErr } = await client
        .from('profiles')
        .update({
          generation_credits_balance: bal - amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('generation_credits_balance', bal)
        .select('id')
        .maybeSingle();
      if (upErr) throw new InternalServerErrorException(upErr.message);
      if (updated) {
        await this.appendCreditLedgerEntry({
          userId,
          delta: -amount,
          balanceAfter: bal - amount,
          reason: 'reserve',
          referenceType: context?.referenceType,
          referenceId: context?.referenceId,
          metadata: { amount },
        });
        return;
      }
    }

    throw new ConflictException({
      code: 'CREDITS_RESERVATION_CONFLICT',
      message: 'Could not reserve credits. Please try again.',
    });
  }

  /** Increments balance (e.g. refund unused reserved credits). Best-effort compare-and-swap. */
  async refundGenerationCredits(
    userId: string,
    amount: number,
    context?: { referenceType?: string; referenceId?: string },
  ): Promise<void> {
    if (amount <= 0) return;
    const client = this.supabase.getAdminClient();

    for (let attempt = 0; attempt < RESERVE_RETRY; attempt++) {
      const { data: row, error: selErr } = await client
        .from('profiles')
        .select('generation_credits_balance')
        .eq('id', userId)
        .maybeSingle();
      if (selErr) {
        this.logger.warn(`refund select failed: ${selErr.message}`);
        return;
      }
      if (!row) return;
      const bal = row.generation_credits_balance as number;
      const { data: updated, error: upErr } = await client
        .from('profiles')
        .update({
          generation_credits_balance: bal + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('generation_credits_balance', bal)
        .select('id')
        .maybeSingle();
      if (upErr) {
        this.logger.warn(`refund update failed: ${upErr.message}`);
        return;
      }
      if (updated) {
        await this.appendCreditLedgerEntry({
          userId,
          delta: amount,
          balanceAfter: bal + amount,
          reason: 'refund',
          referenceType: context?.referenceType,
          referenceId: context?.referenceId,
          metadata: { amount },
        });
        return;
      }
    }
    this.logger.warn(`refund gave up after ${RESERVE_RETRY} attempts for user ${userId}`);
  }

  async getGenerationCredits(userId: string) {
    await this.ensureProfileRow(userId);
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('profiles')
      .select(
        'generation_credits_balance, generation_credits_total_granted, generation_credits_quota',
      )
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) return DEFAULT_CREDITS;
    return {
      balance: data.generation_credits_balance as number,
      totalGranted:
        (data.generation_credits_total_granted as number | null) ??
        (data.generation_credits_quota as number | null) ??
        DEFAULT_CREDITS.totalGranted,
    };
  }

  async getCreditLedger(userId: string, limit = 30) {
    const client = this.supabase.getAdminClient();
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const { data, error } = await client
      .from('credit_ledger')
      .select(
        'id, delta, balance_after, reason, reference_type, reference_id, metadata, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) throw new InternalServerErrorException(error.message);
    return (data ?? []) as Array<{
      id: string;
      delta: number;
      balance_after: number;
      reason: 'trial_grant' | 'purchase' | 'reserve' | 'refund' | 'manual_adjustment';
      reference_type: string | null;
      reference_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>;
  }
}
