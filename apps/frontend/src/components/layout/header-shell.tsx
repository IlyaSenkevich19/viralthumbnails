'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, Menu } from 'lucide-react';
import { usePipelineJobSurface } from '@/lib/hooks/use-pipeline-job-surface';
import { BrandWordmark } from '@/components/layout/brand-wordmark';
import { AppRoutes } from '@/config/routes';
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
  const pipelineJob = usePipelineJobSurface();
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
            <div className="flex min-w-0 items-center pt-0.5">
              <BrandWordmark className="truncate text-sm sm:text-base" href={AppRoutes.dashboard} />
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-2.5',
            alignActionsTop ? 'pt-0.5 sm:pt-1' : 'pt-0.5',
          )}
        >
          {pipelineJob.active && pipelineJob.label ? (
            <p
              className="flex min-w-0 max-w-[6.5rem] items-center gap-1.5 truncate text-xs text-muted-foreground sm:max-w-[10rem]"
              role="status"
              aria-live="polite"
              title={pipelineJob.label}
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
              <span className="min-w-0 truncate">{pipelineJob.label}</span>
            </p>
          ) : null}
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
