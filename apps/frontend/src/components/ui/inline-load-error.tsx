import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InlineLoadErrorProps = {
  message: string;
  /** When set, shows a secondary outline action (e.g. `refetch` from TanStack Query). */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Inline list / section error with optional TanStack-friendly retry. */
export function InlineLoadError({
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
}: InlineLoadErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 text-destructive">{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void onRetry()}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
