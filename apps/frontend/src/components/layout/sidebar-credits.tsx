'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_TRIAL_GENERATION_CREDITS } from '@/config/credits';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { cn } from '@/lib/utils';
import { CollapsedSidebarTooltip } from '@/components/layout/collapsed-sidebar-tooltip';
import { AppRoutes } from '@/config/routes';

const shellFocus =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]';

/** Shareable progress width for “remaining of bundle” readability. */
function creditFillPercent(balance: number, totalGranted: number) {
  const cap = Math.max(1, totalGranted);
  return Math.round(Math.min(100, Math.max(0, (balance / cap) * 100)));
}

export function SidebarCreditsBlock({
  collapsed,
  inDrawer,
  onDrawerNavigate,
}: {
  collapsed: boolean;
  inDrawer: boolean;
  /** Close mobile drawer when user is already on credits and taps credits again. */
  onDrawerNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isCreditsPage = pathname === AppRoutes.credits;
  const compact = collapsed && !inDrawer;
  const { user, isLoading: authLoading } = useAuth();
  const { data, isError, isFetching, isPending } = useGenerationCredits();

  const showSkeleton =
    authLoading || (!!user && !data && !isError && (isFetching || isPending));

  const onNavigate = () => {
    if (inDrawer && pathname === AppRoutes.credits) onDrawerNavigate?.();
  };

  const activeRing =
    'ring-[1.5px] ring-primary/45 shadow-[inset_0_0_0_1px_rgba(255,59,59,0.12)]';

  if (showSkeleton) {
    return (
      <CollapsedSidebarTooltip enabled={compact} label="Credits">
        <Link
          href={AppRoutes.credits}
          onClick={onNavigate}
          aria-label="Credits — view credit packs and top up"
          className={cn(
            shellFocus,
            'block w-full rounded-lg',
            compact && 'flex justify-center',
            isCreditsPage && activeRing,
          )}
        >
          <Skeleton className={cn(compact ? 'size-11 shrink-0 rounded-lg' : 'h-[5.125rem] w-full rounded-lg')} aria-hidden />
        </Link>
      </CollapsedSidebarTooltip>
    );
  }

  const fallback = {
    balance: DEFAULT_TRIAL_GENERATION_CREDITS,
    totalGranted: DEFAULT_TRIAL_GENERATION_CREDITS,
  };
  const effective = isError || !data ? fallback : data;
  const { balance, totalGranted } = effective;
  const exhausted = balance <= 0;
  const showGranted = totalGranted > balance && totalGranted > 0;
  const pct = creditFillPercent(balance, showGranted ? totalGranted : balance);
  const title = `${balance} credits${showGranted ? ` of ${totalGranted}` : ''}`;

  /** Compact sidebar: condensed “wallet chip”. */
  if (compact) {
    return (
      <div className="flex w-full justify-center">
        <CollapsedSidebarTooltip label={`Credits · ${balance}`} enabled={true}>
          <Link
            href={AppRoutes.credits}
            onClick={onNavigate}
            aria-label="Credits — view credit packs and top up"
            className={cn(
              shellFocus,
              'group relative flex size-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg',
              'border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-white/[0.02]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.07),var(--shadow-soft)]',
              'transition-[border-color,transform,box-shadow] duration-200 ease-[var(--ease-standard)]',
              'hover:border-primary/35 hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_-14px_rgba(255,59,59,0.42)] active:translate-y-0',
              exhausted &&
                'border-amber-500/25 hover:border-amber-400/40 hover:shadow-[0_12px_28px_-14px_rgba(251,191,36,0.28)]',
              isCreditsPage && activeRing,
            )}
          >
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-70"
              aria-hidden
            />
            <Coins
              className={cn(
                'relative z-[1] h-3 w-3 shrink-0 text-primary/95',
                exhausted && 'text-amber-400/95',
              )}
              aria-hidden
              strokeWidth={2}
            />
            <span className={cn(
              'relative z-[1] mt-px text-[11px] font-bold tabular-nums leading-none text-foreground',
              exhausted && 'text-amber-200/95',
            )}>
              {balance}
            </span>
            <span className="sr-only">{title}</span>
          </Link>
        </CollapsedSidebarTooltip>
      </div>
    );
  }

  /** Expanded sidebar: ledger-style card with ambient glow + progress hint. */
  return (
    <Link
      href={AppRoutes.credits}
      onClick={onNavigate}
      aria-label="Credits — view credit packs and top up"
      className={cn(
        shellFocus,
        'group relative block overflow-hidden rounded-xl border border-white/[0.08]',
        'bg-gradient-to-br from-[color-mix(in_srgb,var(--card)_94%,transparent)] via-card to-[color-mix(in_srgb,var(--card)_88%,#0a0a0f)]',
        'p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),var(--shadow-soft)]',
        'transition-[border-color,transform,box-shadow] duration-200 ease-[var(--ease-standard)]',
        'hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-22px_rgba(255,59,59,0.38),inset_0_1px_0_rgba(255,255,255,0.06)]',
        'active:translate-y-0',
        exhausted &&
          'border-amber-500/22 hover:border-amber-400/35 hover:shadow-[0_20px_44px_-22px_rgba(251,191,36,0.22)]',
        isCreditsPage && activeRing,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-primary/22 blur-[48px]"
        aria-hidden
      />

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            'border border-white/[0.08] bg-[color-mix(in_srgb,var(--background)_55%,transparent)]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
            exhausted &&
              'border-amber-500/25 bg-amber-950/25 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]',
          )}
        >
          <Coins className={cn('h-[1.375rem] w-[1.375rem] text-primary', exhausted && 'text-amber-400')} aria-hidden strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Credits</p>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[1.875rem] font-bold tabular-nums leading-none tracking-tight text-foreground">{balance}</span>
            {showGranted ? (
              <span className="pb-px text-xs font-medium tabular-nums text-muted-foreground"> / {totalGranted}</span>
            ) : null}
          </div>

          {(showGranted || exhausted) ? (
            <div className="mt-3">
              <div className="h-1 overflow-hidden rounded-full bg-black/28 ring-1 ring-white/[0.05]">
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-[width] duration-300 ease-[var(--ease-standard)]',
                    exhausted && 'from-amber-500 via-amber-400 to-amber-500/80',
                  )}
                  style={{ width: `${exhausted ? 0 : pct}%` }}
                />
              </div>
              {exhausted ? (
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Out of credits — open the credits page for packs.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
