import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const DEFAULT_CREDITS = { balance: 3, quota: 3 };
const RESERVE_RETRY = 8;

/**
 * Credits for one `POST /thumbnails/from-video`: 1× video analysis + N× image gen + N× ranking.
 * Keeps spend in line with multiple OpenRouter calls per request.
 */
export function creditsForVideoPipeline(requestedThumbnailCount: number): number {
  const n = Math.min(12, Math.max(1, Math.floor(requestedThumbnailCount)));
  return 1 + 2 * n;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** @see creditsForVideoPipeline */
  videoPipelineCreditCost(requestedThumbnailCount: number): number {
    return creditsForVideoPipeline(requestedThumbnailCount);
  }

  async reserveGenerationCredits(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
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
            'No profile row for this account. Complete onboarding or run Supabase migrations so profiles exist.',
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
      if (updated) return;
    }

    throw new ConflictException({
      code: 'CREDITS_RESERVATION_CONFLICT',
      message: 'Could not reserve credits. Please try again.',
    });
  }

  /** Increments balance (e.g. refund unused reserved credits). Best-effort compare-and-swap. */
  async refundGenerationCredits(userId: string, amount: number): Promise<void> {
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
      if (updated) return;
    }
    this.logger.warn(`refund gave up after ${RESERVE_RETRY} attempts for user ${userId}`);
  }

  async getGenerationCredits(userId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('profiles')
      .select('generation_credits_balance, generation_credits_quota')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) return DEFAULT_CREDITS;
    return {
      balance: data.generation_credits_balance as number,
      quota: data.generation_credits_quota as number,
    };
  }
}
