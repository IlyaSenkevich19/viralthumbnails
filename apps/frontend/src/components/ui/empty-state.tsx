import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Decorative icon wrapper (typically `rounded-2xl bg-primary/15 …`). */
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** `compact` for pagination edges, filtered lists inside panels, etc. */
  density?: 'default' | 'compact';
};

/** Shared empty / zero-data pattern across list pages (avatars, templates, projects, etc.). */
export function EmptyState({
  title,
  description,
  icon,
  className,
  children,
  density = 'default',
}: EmptyStateProps) {
  const isCompact = density === 'compact';
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        isCompact ? 'gap-4 px-4 py-8 sm:py-9' : 'gap-5 px-6 py-12 sm:py-14',
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 [&_svg]:shrink-0',
            isCompact ? 'h-11 w-11' : 'h-14 w-14',
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className={cn('space-y-2', isCompact && 'space-y-1.5')}>
        <p
          className={cn(
            'font-semibold tracking-tight text-foreground',
            isCompact ? 'text-sm' : 'text-base',
          )}
        >
          {title}
        </p>
        {description ? (
          <div
            className={cn(
              'mx-auto max-w-sm leading-relaxed text-muted-foreground',
              isCompact ? 'text-xs' : 'text-sm',
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export type EmptyStateCardProps = EmptyStateProps & {
  cardClassName?: string;
};

/** `EmptyState` wrapped in `Card` with `p-0` content—the standard blank-slate chrome. */
export function EmptyStateCard({ cardClassName, className, ...emptyProps }: EmptyStateCardProps) {
  return (
    <Card className={cn(cardClassName)}>
      <CardContent className="p-0">
        <EmptyState className={className} {...emptyProps} />
      </CardContent>
    </Card>
  );
}
