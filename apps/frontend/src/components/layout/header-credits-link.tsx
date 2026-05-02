'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useGenerationCredits } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';
import { Skeleton } from '@/components/ui/skeleton';

/** Header credits: glass tint from palette (`primary` / `warning`) — reads as chrome, not a solid CTA. */
export function HeaderCreditsLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const isCreditsPage = pathname === AppRoutes.credits;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { data, isPending } = useGenerationCredits();

  if (authLoading) {
    return (
      <Skeleton
        className={cn(
          'h-9 w-full min-w-[5rem] rounded-lg border border-primary/45 bg-primary/20 backdrop-blur-xl lg:h-10',
          className,
        )}
        aria-hidden
      />
    );
  }
  if (!user?.id || !accessToken) return null;

  const balance = data?.balance;
  const balanceLoading = isPending && balance == null;
  const exhausted = typeof balance === 'number' && balance <= 0;
  const label = balanceLoading
    ? 'Loading credits'
    : balance != null
      ? `${balance} generation credit${balance === 1 ? '' : 's'}`
      : 'Credits';

  return (
    <Link
      href={AppRoutes.credits}
      className={cn(
        'motion-base relative inline-flex h-9 w-full min-w-[5rem] max-w-none shrink-0 items-center justify-center gap-2 rounded-lg border px-3',
        'border-primary/48 bg-primary/14 text-sm font-semibold tabular-nums text-foreground backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] transition-[border-color,box-shadow,transform,background-color,color] duration-200 ease-[var(--ease-standard)]',
        'hover:-translate-y-px hover:border-primary/72 hover:bg-primary/24 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_20px_-8px_rgb(255_59_59/0.28)]',
        'active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        exhausted &&
          'border-warning/55 bg-warning/16 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:border-warning/80 hover:bg-warning/26 hover:shadow-[0_8px_20px_-8px_rgb(251_191_36/0.22)]',
        isCreditsPage &&
          !exhausted &&
          'border-primary/65 bg-primary/22 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]',
        'lg:h-10 lg:min-w-[5.75rem] lg:gap-2.5 lg:px-[0.9375rem] lg:text-[0.8125rem]',
        className,
        'min-h-9 lg:min-h-10',
      )}
      aria-label={`${label}. View credit packs and top up.`}
    >
      <Coins
        className={cn('size-3.5 shrink-0 text-primary lg:size-4', exhausted && 'text-warning')}
        aria-hidden
        strokeWidth={2.25}
      />
      <span className="min-w-[1rem] translate-y-[0.03em] text-center lg:min-w-[1.125rem]">
        {balanceLoading ? (
          <Loader2
            className={cn(
              'mx-auto size-3.5 shrink-0 animate-spin lg:size-4',
              exhausted ? 'text-warning/70' : 'text-muted-foreground',
            )}
            aria-hidden
          />
        ) : (
          <span className="tabular-nums tracking-tight">{balance ?? '—'}</span>
        )}
      </span>
    </Link>
  );
}
