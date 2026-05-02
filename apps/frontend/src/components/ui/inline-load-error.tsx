import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InlineLoadErrorProps = {
  message: string;
  /** When set, shows a secondary outline action (e.g. `refetch` from TanStack Query). */
  onRetry?: () => void;
  retryLabel?: string;
  /**
   * `destructive` — failed fetch / blocking error (default).
   * `neutral` — softer gate (e.g. sign-in required); uses `role="status"`.
   */
  tone?: 'destructive' | 'neutral';
  /** Secondary actions beside retry (e.g. sign-in Link styled as a button). */
  extraActions?: ReactNode;
  className?: string;
};

/** Inline list / section error with optional TanStack-friendly retry. */
export function InlineLoadError({
  message,
  onRetry,
  retryLabel = 'Try again',
  tone = 'destructive',
  extraActions,
  className,
}: InlineLoadErrorProps) {
  const hasActions = Boolean(onRetry || extraActions);
  return (
    <div
      role={tone === 'neutral' ? 'status' : 'alert'}
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        tone === 'neutral'
          ? 'border-border/80 bg-muted/35 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'border-destructive/30 bg-destructive/10',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className={cn('min-w-0', tone === 'neutral' ? 'text-foreground' : 'text-destructive')}>{message}</p>
        {hasActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {extraActions}
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
                {retryLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
