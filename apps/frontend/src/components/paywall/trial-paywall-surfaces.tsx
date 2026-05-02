'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AppRoutes } from '@/config/routes';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { emitPaywallFunnelEvent } from '@/lib/paywall-funnel';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { openInsufficientCreditsPaywall } from '@/components/paywall/insufficient-credits-paywall';

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
          openInsufficientCreditsPaywall({
            title: 'Credit packs',
            description:
              'One-time packs — no subscription. Continue to checkout or browse the full credits page.',
          });
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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() =>
              openInsufficientCreditsPaywall({
                title: 'Out of credits',
                description: 'Add a one-time pack to keep generating thumbnails.',
                have: balance,
              })
            }
          >
            View credit packs
          </Button>
          <Link
            href={AppRoutes.credits}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'w-full text-muted-foreground sm:w-auto',
            )}
          >
            Open credits page
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
