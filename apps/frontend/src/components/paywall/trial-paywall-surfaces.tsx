'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import { DEFAULT_TRIAL_GENERATION_CREDITS } from '@/config/credits';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { emitPaywallFunnelEvent } from '@/lib/paywall-funnel';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_TRIAL_BANNER = 'vt_trial_paywall_banner_dismissed';
const SESSION_LOW_CREDITS = 'vt_low_credits_toast_shown';

/**
 * Dashboard-only surfaces: explain trial / paid model, warn at 0 credits, soft hint at 1 credit.
 */
export function TrialPaywallSurfaces() {
  const { data: credits, isPending, isError } = useGenerationCredits();
  const [trialDismissed, setTrialDismissed] = useState(false);

  useEffect(() => {
    try {
      setTrialDismissed(window.localStorage.getItem(STORAGE_TRIAL_BANNER) === '1');
    } catch {
      setTrialDismissed(false);
    }
  }, []);

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

  const { balance, totalGranted } = credits;
  const isTrialSizing = totalGranted <= DEFAULT_TRIAL_GENERATION_CREDITS;

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

  if (trialDismissed) return null;

  const headline = isTrialSizing
    ? 'You’re on trial credits'
    : 'Credit-based app — no subscription';
  const body = isTrialSizing
    ? `You have ${balance} generation credit${balance === 1 ? '' : 's'} left to explore. After that, use one-time credit packs whenever you need more.`
    : `You have ${balance} credit${balance === 1 ? '' : 's'}. Top up with a pack anytime — pay per use, no monthly plan.`;

  return (
    <div
      className={cn(
        'relative rounded-xl border border-primary/25 bg-primary/[0.08] px-4 py-3 pr-10 text-sm text-foreground',
      )}
    >
      <p className="font-medium text-foreground">{headline}</p>
      <p className="mt-1 text-muted-foreground leading-snug">{body}</p>
      <Link
        href={AppRoutes.credits}
        className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Credit packs
      </Link>
      <button
        type="button"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
        aria-label="Dismiss"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_TRIAL_BANNER, '1');
          } catch {
            /* ignore */
          }
          setTrialDismissed(true);
          emitPaywallFunnelEvent('trial_banner_dismissed');
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
