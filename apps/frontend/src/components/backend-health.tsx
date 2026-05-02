'use client';

import { Badge } from '@/components/ui/badge';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBackendHealth } from '@/lib/hooks';

function healthCheckMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'unhealthy') {
    return 'API health check failed (server returned an error).';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Could not reach the API.';
}

/** Small API ping indicator for Settings diagnostics; aligns with unified load + error UI. */
export function BackendHealth() {
  const { isPending, isSuccess, isError, error, refetch } = useBackendHealth();

  if (isPending) {
    return (
      <span className="inline-flex flex-col gap-1">
        <Skeleton className="h-7 w-[5.5rem] rounded-full" aria-hidden />
        <span className="sr-only">Checking API health…</span>
      </span>
    );
  }

  if (isSuccess) {
    return (
      <Badge
        className={cn(
          'border-emerald-500/30 bg-emerald-600 text-white shadow-sm',
          'hover:bg-emerald-600 motion-base',
        )}
      >
        API: OK
      </Badge>
    );
  }

  if (isError) {
    return (
      <InlineLoadError
        className="basis-full py-2.5 sm:max-w-xl"
        message={healthCheckMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  return null;
}
