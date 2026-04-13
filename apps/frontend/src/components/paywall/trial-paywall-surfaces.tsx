'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AppRoutes } from '@/config/routes';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { emitPaywallFunnelEvent } from '@/lib/paywall-funnel';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SESSION_LOW_CREDITS = 'vt_low_credits_toast_shown';

export function TrialPaywallSurfaces() {
  const { data: credits, isPending, isError } = useGenerationCredits();

  useEffect(() => {
    if (isPending || isError || !credits) return;
    if (credits.balance !== 1) return;
    try {
      if (window.sessionStorage.getItem(SESSION_LOW_CREDITS) === '1') return;
      window.sessionStorage.setItem(SESSION_LOW_CREDITS, '1');
    } catch {
      return;
    }
    emitPaywallFunnelEvent('credits_low_hint', { balance: credits.balance });
    toast.message('Last credit', {
      description: 'Your next generation uses your last trial credit. Credit packs are one-time — no subscription.',
      action: {
        label: 'View packs',
        onClick: () => {
          window.location.href = AppRoutes.credits;
        },
      },
    });
  }, [credits, isPending, isError]);

  if (isPending || isError || !credits) return null;

  const { balance } = credits;

  if (balance <= 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-amber-500/35 bg-amber-500/[0.12] px-4 py-3 text-sm text-foreground',
          'shadow-sm shadow-amber-950/20',
        )}
        role="status"
      >
        <p className="font-medium text-foreground">You&apos;re out of credits</p>
        <p className="mt-1 text-muted-foreground">
          Generations use credits. Buy a one-time pack to continue — no subscription.
        </p>
        <Link
          href={AppRoutes.credits}
          className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex w-full sm:w-auto')}
        >
          View credit packs
        </Link>
      </div>
    );
  }

  return null;
}
