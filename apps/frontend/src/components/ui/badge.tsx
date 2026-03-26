import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium motion-base',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-muted-foreground',
        glass: 'glass text-foreground',
        success: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300',
        gradient: 'border-transparent bg-primary text-white shadow-soft',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

