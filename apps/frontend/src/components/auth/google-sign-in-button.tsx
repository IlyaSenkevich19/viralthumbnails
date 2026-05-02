'use client';

import { Loader2 } from 'lucide-react';
import { GoogleGIcon } from '@/components/auth/google-g-icon';
import { cn } from '@/lib/utils';

type GoogleSignInButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

/**
 * Google OAuth — matches dark app chrome (card + border) while keeping the multicolor G for recognition.
 */
export function GoogleSignInButton({
  onClick,
  disabled = false,
  loading = false,
  className,
}: GoogleSignInButtonProps) {
  const busy = loading || disabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={loading}
      aria-label={loading ? 'Continuing with Google' : 'Continue with Google'}
      className={cn(
        'motion-base flex h-12 w-full items-center justify-center gap-3 rounded-xl px-4',
        'border border-border bg-card text-foreground shadow-[var(--shadow-soft)] ring-1 ring-white/[0.06]',
        'transition-[background-color,border-color,box-shadow,transform] duration-200',
        'hover:border-border-hover hover:bg-secondary',
        'active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center" aria-hidden>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none" />
        ) : (
          <GoogleGIcon className="h-[22px] w-[22px]" />
        )}
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </span>
    </button>
  );
}
