'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, Menu, Plus } from 'lucide-react';
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
import { buttonVariants } from '@/components/ui/button';

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
  const isProjectDetailHeader = isProjectVariantsPath(pathname) && hasPageHeader;
  const alignActionsTop = hasPageHeader || variantsPending;
  const showCreateCta = pathname !== AppRoutes.create;

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
            <div className="min-w-0 pr-1">
              {merged.eyebrow ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {merged.eyebrow}
                </p>
              ) : null}
              <h1
                className={cn(
                  'text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl',
                  merged.eyebrow ? 'mt-1.5 sm:mt-2' : 'mt-0',
                  isProjectDetailHeader && 'truncate',
                )}
                title={isProjectDetailHeader && typeof merged.title === 'string' ? merged.title : undefined}
              >
                {merged.title}
              </h1>
            </div>
          ) : (
            <div className="flex min-w-0 items-center pt-0.5">
              <BrandWordmark className="truncate text-sm sm:text-base" href={AppRoutes.create} />
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-2.5',
            alignActionsTop ? 'pt-0.5 sm:pt-1' : 'pt-0.5',
          )}
        >
          {showCreateCta ? (
            <Link
              href={AppRoutes.create}
              className={cn(buttonVariants({ size: 'sm' }), 'hidden gap-1.5 px-3 lg:inline-flex')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Create
            </Link>
          ) : null}
          {pipelineJob.active && pipelineJob.label ? (
            <p
              className="flex min-w-0 max-w-[6.5rem] items-center gap-1.5 truncate text-xs text-muted-foreground sm:max-w-[10rem]"
              role="status"
              aria-live="polite"
              title={pipelineJob.label}
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
              <span className="hidden min-w-0 truncate sm:inline">{pipelineJob.label}</span>
            </p>
          ) : null}
          <div className="w-[5.5rem] sm:w-[6rem] lg:w-[6.5rem]">
            <HeaderCreditsLink className="h-full w-full max-w-none" />
          </div>
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
