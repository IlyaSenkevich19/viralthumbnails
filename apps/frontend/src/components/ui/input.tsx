import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground motion-base focus-ring focus-visible:border-border-hover disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
