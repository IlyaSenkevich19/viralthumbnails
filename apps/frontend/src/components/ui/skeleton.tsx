import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'relative overflow-hidden rounded-md bg-secondary',
        'before:absolute before:inset-0 before:content-[""] before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        className,
      )}
      {...props}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export { Skeleton };
