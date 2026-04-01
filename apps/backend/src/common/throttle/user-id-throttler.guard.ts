import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limits by Supabase `userId` when present (set by {@link SupabaseGuard}),
 * otherwise falls back to IP — avoids one NAT wiping shared limits for all users.
 */
@Injectable()
export class UserIdThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const id = req.userId;
    if (typeof id === 'string' && id.length > 0) {
      return Promise.resolve(`uid:${id}`);
    }
    const ip = req.ip ?? (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress;
    return Promise.resolve(`ip:${ip ?? 'unknown'}`);
  }
}
