'use client';

import { Menu } from 'lucide-react';
import { siteName } from '@/config/site';
import { cn } from '@/lib/utils';

export function HeaderShell({
  onMobileMenuClick,
  className,
}: {
  onMobileMenuClick?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/90 shadow-md shadow-primary/30" />
        <span className="text-sm font-semibold tracking-tight text-foreground">{siteName}</span>
      </div>
      <button
        type="button"
        onClick={onMobileMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground motion-base hover:border-border-hover hover:bg-secondary hover:text-foreground focus-ring"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
    </header>
  );
}
