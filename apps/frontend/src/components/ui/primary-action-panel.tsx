import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const PrimaryActionPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn(
      'relative overflow-hidden border-white/10 bg-[radial-gradient(ellipse_at_top_right,rgba(255,59,59,0.08),transparent_52%),var(--card)]',
      'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/45 before:to-transparent',
      className,
    )}
    {...props}
  />
));

PrimaryActionPanel.displayName = 'PrimaryActionPanel';
