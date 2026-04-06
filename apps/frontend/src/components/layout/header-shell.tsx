'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { siteName } from '@/config/site';
import { usePageFrame } from '@/contexts/page-frame-context';
import {
  isProjectVariantsPath,
  resolveStaticPageFrame,
} from '@/lib/page-frame-from-path';
import { cn } from '@/lib/utils';
import { HeaderCreditsLink } from '@/components/layout/header-credits-link';
import { Skeleton } from '@/components/ui/skeleton';

export function HeaderShell({
  onMobileMenuClick,
  className,
}: {
  onMobileMenuClick?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { frame } = usePageFrame();
  const staticFrame = useMemo(() => resolveStaticPageFrame(pathname), [pathname]);

  const merged = useMemo(
    () => ({
      title: frame.title ?? staticFrame?.title ?? null,
      eyebrow: frame.eyebrow ?? staticFrame?.eyebrow ?? null,
    }),
    [frame.title, frame.eyebrow, staticFrame],
  );

  const variantsPending = isProjectVariantsPath(pathname) && !merged.title;
  const hasPageHeader = Boolean(merged.title);
  const alignActionsTop = hasPageHeader || variantsPending;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 shrink-0 border-b border-border bg-card/80 shadow-sm backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex min-h-14 items-start justify-between gap-4 px-4 py-3 sm:min-h-[3.75rem] sm:px-6 sm:py-4 lg:min-h-16 lg:px-10">
        <div className="min-w-0 flex-1">
          {variantsPending ? (
            <div
              className="pt-0.5"
              role="status"
              aria-busy="true"
              aria-label="Loading page title"
            >
              <Skeleton className="h-7 w-[min(18rem,88%)] rounded-md sm:h-8 lg:h-9" />
            </div>
          ) : hasPageHeader ? (
            <div>
              {merged.eyebrow ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {merged.eyebrow}
                </p>
              ) : null}
              <h1
                className={cn(
                  'text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl',
                  merged.eyebrow ? 'mt-1.5 sm:mt-2' : 'mt-0',
                )}
              >
                {merged.title}
              </h1>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5 pt-0.5">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-primary/90 shadow-md shadow-primary/30 sm:h-8 sm:w-8" aria-hidden />
              <span className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                {siteName}
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-2.5',
            alignActionsTop ? 'pt-0.5 sm:pt-1' : 'pt-0.5',
          )}
        >
          <HeaderCreditsLink className="max-w-[10rem] sm:max-w-[12rem] lg:max-w-none" />
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground motion-base hover:border-border-hover hover:bg-secondary hover:text-foreground focus-ring lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
