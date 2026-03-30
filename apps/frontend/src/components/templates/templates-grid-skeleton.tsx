import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TemplatesGridSkeletonProps = {
  /** Matches `/templates` grid. */
  variant?: 'page' | 'picker';
  /** Approximate cells (capped for layout). */
  count?: number;
  className?: string;
};

export function TemplatesGridSkeleton({
  variant = 'page',
  count,
  className,
}: TemplatesGridSkeletonProps) {
  const n = count ?? (variant === 'page' ? 9 : 8);
  const gridClass =
    variant === 'page'
      ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={cn(gridClass, className)} aria-busy="true" aria-label="Loading templates">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <Skeleton className="aspect-video w-full rounded-none" />
          {variant === 'page' ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : (
            <Skeleton className="mx-2 mb-2 mt-1.5 h-3 w-2/3" />
          )}
        </div>
      ))}
    </div>
  );
}
