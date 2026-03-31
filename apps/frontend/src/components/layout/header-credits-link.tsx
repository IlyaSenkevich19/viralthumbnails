'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useGenerationCredits } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';

export function HeaderCreditsLink({ className }: { className?: string }) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { data, isPending } = useGenerationCredits();

  if (authLoading || !user?.id || !accessToken) return null;

  const balance = data?.balance;
  const label =
    balance != null ? `${balance} generation credit${balance === 1 ? '' : 's'}` : 'Credits';

  return (
    <Link
      href={AppRoutes.credits}
      className={cn(
        'motion-base inline-flex h-9 max-w-[9rem] items-center gap-1.5 overflow-hidden rounded-lg border border-border bg-secondary/80 px-2.5 text-xs font-semibold tabular-nums text-foreground',
        'hover:border-border-hover hover:bg-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`${label}. View plans and top up.`}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 truncate">{isPending && balance == null ? '…' : balance ?? '—'}</span>
    </Link>
  );
}
