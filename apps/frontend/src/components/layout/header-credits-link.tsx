'use client';

import Link from 'next/link';
import { Coins, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useGenerationCredits } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';
import { Skeleton } from '@/components/ui/skeleton';

export function HeaderCreditsLink({ className }: { className?: string }) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { data, isPending } = useGenerationCredits();

  if (authLoading) {
    return <Skeleton className={cn('h-9 w-full rounded-full lg:h-10', className)} aria-hidden />;
  }
  if (!user?.id || !accessToken) return null;

  const balance = data?.balance;
  const balanceLoading = isPending && balance == null;
  const label = balanceLoading
    ? 'Loading credits'
    : balance != null
      ? `${balance} generation credit${balance === 1 ? '' : 's'}`
      : 'Credits';

  return (
    <Link
      href={AppRoutes.credits}
      className={cn(
        'motion-base group relative inline-flex h-9 max-w-[10rem] items-center justify-center gap-1.5 overflow-hidden rounded-full border border-amber-500/40',
        'bg-gradient-to-r from-amber-500/[0.18] via-amber-600/[0.1] to-primary/[0.12]',
        'px-3 text-xs font-bold tabular-nums tracking-tight text-foreground shadow-md shadow-amber-950/25',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/[0.07] before:to-transparent',
        'hover:border-amber-400/55 hover:from-amber-500/[0.26] hover:via-amber-500/[0.14] hover:shadow-lg hover:shadow-amber-950/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'lg:h-10 lg:max-w-[11rem] lg:gap-2 lg:px-3.5 lg:text-[13px]',
        className,
      )}
      aria-label={`${label}. View credit packs and top up.`}
    >
      <span
        className={cn(
          'relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-md',
          'bg-gradient-to-br from-amber-400/35 to-amber-600/25 text-amber-100',
          'shadow-inner shadow-amber-950/20 ring-1 ring-amber-300/25',
          'group-hover:from-amber-300/45 group-hover:to-amber-500/35 group-hover:text-amber-50',
          'lg:size-7',
        )}
        aria-hidden
      >
        <Coins className="size-3 lg:size-3.5" strokeWidth={2.25} />
      </span>
      <span className="relative z-[1] flex min-h-[1em] min-w-[1.125rem] items-center justify-center">
        {balanceLoading ? (
          <Loader2
            className="size-3.5 shrink-0 animate-spin text-foreground/85 lg:size-4"
            aria-hidden
          />
        ) : (
          <span className="-translate-y-px truncate leading-none text-foreground tabular-nums">
            {balance ?? '—'}
          </span>
        )}
      </span>
    </Link>
  );
}
