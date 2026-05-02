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
import { InfoHint } from '@/components/ui/info-hint';

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
      description:
        'Your next generation spends your last free credit — top up anytime with one-off packs when you are ready.',
      action: {
        label: 'View packs',
        onClick: () => {
          openInsufficientCreditsPaywall({
            title: 'Credit packs',
            description: 'Credit packs are one-time purchases — pick a tier, then checkout or review on the credits page.',
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <p className="min-w-0 font-medium text-foreground">You&apos;re out of credits</p>
          <InfoHint
            className="shrink-0"
            buttonLabel="How to top up credits"
            helpBody={
              <p>Each successful run pulls from your balance; one-off packs refill credits whenever you decide to buy more.</p>
            }
          />
        </div>
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
