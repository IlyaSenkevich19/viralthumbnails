'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PageBreadcrumbSegment } from '@/contexts/page-frame-context';
import { usePathname } from 'next/navigation';
import { ChevronRight, Loader2, Menu, Plus } from 'lucide-react';
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

function HeaderBreadcrumb({
  segments,
  eyebrowOffset,
  isProjectDetail,
}: {
  segments: PageBreadcrumbSegment[];
  eyebrowOffset: boolean;
  isProjectDetail: boolean;
}) {
  return (
    <nav
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-base leading-none',
        eyebrowOffset ? 'mt-1.5 sm:mt-2' : 'mt-0',
      )}
      aria-label="Breadcrumb"
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={`${seg.label}-${i}`} className="inline-flex min-w-0 max-w-full items-center gap-2">
            {i > 0 ? (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/45" aria-hidden />
            ) : null}
            {isLast ? (
              <h1
                className={cn(
                  'min-w-0 text-base font-semibold tracking-tight text-foreground sm:text-[1.0625rem]',
                  isProjectDetail && 'truncate',
                )}
                title={isProjectDetail ? seg.label : undefined}
              >
                {seg.label}
              </h1>
            ) : seg.href ? (
              <Link
                href={seg.href}
                className="shrink-0 font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {seg.label}
              </Link>
            ) : (
              <span className="shrink-0 font-medium text-muted-foreground">{seg.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

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
      breadcrumb: frame.breadcrumb ?? staticFrame?.breadcrumb ?? null,
    }),
    [frame.title, frame.eyebrow, frame.breadcrumb, staticFrame],
  );

  const variantsPending = isProjectVariantsPath(pathname) && !merged.title;
  const hasPageHeader = Boolean(merged.title) || Boolean(merged.breadcrumb?.length);
  const isProjectDetailHeader =
    isProjectVariantsPath(pathname) && (Boolean(merged.title) || Boolean(merged.breadcrumb?.length));
  const alignActionsTop = hasPageHeader || variantsPending;
  const showCreateCta = pathname !== AppRoutes.create;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 shrink-0 border-b border-border bg-card/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-white/[0.04] backdrop-blur-xl',
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
              {merged.breadcrumb && merged.breadcrumb.length > 0 ? (
                <HeaderBreadcrumb
                  segments={merged.breadcrumb}
                  eyebrowOffset={Boolean(merged.eyebrow)}
                  isProjectDetail={isProjectDetailHeader}
                />
              ) : (
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
              )}
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
              className={cn(
                buttonVariants({ size: 'sm' }),
                'hidden max-w-[11.5rem] gap-1.5 px-3 lg:inline-flex xl:max-w-none',
              )}
              title="Open the thumbnail generator"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">Generate thumbnails</span>
            </Link>
          ) : null}
          {pipelineJob.active && pipelineJob.label ? (
            <div
              className="flex min-w-0 max-w-[2.5rem] items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary shadow-soft sm:max-w-[16rem] sm:px-3"
              role="status"
              aria-live="polite"
              title={pipelineJob.label}
            >
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
              <span className="hidden shrink-0 font-medium sm:inline">Generating</span>
              <span className="hidden min-w-0 truncate text-primary/80 sm:inline">{pipelineJob.label}</span>
            </div>
          ) : null}
          <div className="flex w-[5.75rem] shrink-0 sm:w-[6.25rem] lg:w-[6.75rem]">
            {/* Do not pass h-full — parent has no height; it overrides Link’s h-9 and collapses the chip */}
            <HeaderCreditsLink className="w-full" />
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
