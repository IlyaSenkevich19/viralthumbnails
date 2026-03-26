'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { DEFAULT_TRIAL_GENERATION_CREDITS } from '@/config/credits';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { cn } from '@/lib/utils';

const creditsLinkFocus =
  'outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]';

export function SidebarCreditsBlock({
  collapsed,
  inDrawer,
}: {
  collapsed: boolean;
  inDrawer: boolean;
}) {
  const pathname = usePathname();
  const isCreditsPage = pathname === '/credits';
  const compact = collapsed && !inDrawer;
  const { user, isLoading: authLoading } = useAuth();
  const { data, isError, isFetching, isPending } = useGenerationCredits();

  const showSkeleton =
    authLoading ||
    (!!user && !data && !isError && (isFetching || isPending));

  if (showSkeleton) {
    return (
      <Link
        href="/credits"
        aria-label="Credits — view plans and top up"
        className={cn(
          creditsLinkFocus,
          compact ? 'flex w-full justify-center rounded-xl' : 'block w-full rounded-2xl',
          isCreditsPage && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-[var(--sidebar)]',
        )}
      >
        <Skeleton
          className={cn(compact ? 'size-10 shrink-0 rounded-xl' : 'h-[4.75rem] w-full rounded-2xl')}
          aria-hidden
        />
      </Link>
    );
  }

  const fallback = {
    balance: DEFAULT_TRIAL_GENERATION_CREDITS,
    quota: DEFAULT_TRIAL_GENERATION_CREDITS,
  };
  const effective = isError || !data ? fallback : data;
  const { balance, quota } = effective;
  const exhausted = balance <= 0;
  const showQuota = quota !== balance;
  const title = `${balance} credits${showQuota ? ` of ${quota}` : ''}`;

  if (compact) {
    return (
      <div className="flex w-full justify-center">
        <Link
          href="/credits"
          title={title}
          aria-label="Credits — view plans and top up"
          className={cn(
            creditsLinkFocus,
            'flex size-10 shrink-0 flex-col items-center justify-center gap-0 rounded-xl bg-gradient-to-br from-primary/40 via-primary/22 to-primary/10 text-center shadow-md shadow-primary/25',
            isCreditsPage && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[var(--sidebar)]',
            exhausted &&
              'from-amber-500/35 via-amber-500/18 to-amber-600/10 shadow-amber-500/20',
          )}
        >
          <Sparkles
            className={cn('h-2.5 w-2.5 shrink-0 text-primary', exhausted && 'text-amber-300')}
            aria-hidden
          />
          <span className="text-[11px] font-bold tabular-nums leading-none text-white">{balance}</span>
          <span className="sr-only">{title}</span>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/credits"
      aria-label="Credits — view plans and top up"
      className={cn(
        creditsLinkFocus,
        'relative block overflow-hidden rounded-2xl bg-gradient-to-br from-primary/35 from-10% via-primary/[0.14] to-transparent p-4 shadow-[0_0_40px_-10px_rgba(255,59,59,0.55)]',
        isCreditsPage && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-[var(--sidebar)]',
        exhausted &&
          'from-amber-500/30 via-amber-500/12 shadow-[0_0_36px_-10px_rgba(251,191,36,0.4)]',
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/30 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/45">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Credits</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-white">
            {balance}
            {showQuota ? (
              <span className="text-lg font-semibold text-white/45"> / {quota}</span>
            ) : null}
          </p>
          {exhausted ? (
            <p className="mt-1 text-xs leading-snug text-muted-foreground">Upgrade to add more credits</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
