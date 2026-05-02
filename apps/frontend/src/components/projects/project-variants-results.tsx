'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ImageIcon, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ThumbnailVariantRow } from '@/lib/types/project';
import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';
import { VariantStripThumb } from '@/components/projects/project-variant-strip-thumb';
import { ProjectVariantModifyModal } from '@/components/projects/project-variant-modify-modal';
import type { ProjectVariantsRefineControls } from '@/components/projects/project-variants-refine.types';
import { cn } from '@/lib/utils';
import { ProjectVariantsPipelineProgress } from '@/components/projects/project-variants-pipeline-progress';

export type { ProjectVariantsRefineControls } from '@/components/projects/project-variants-refine.types';

type ProjectVariantsResultsProps = {
  projectTitle: string;
  variants: ThumbnailVariantRow[];
  styleByVariantId: Map<string, string>;
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  selectedVariant: ThumbnailVariantRow | null;
  selectedStyleLabel: string | null;
  previewUrl: string | null;
  onRequestDeleteVariant: (variantId: string) => void;
  pipelineJob?: PipelineJobStatusResponse;
  pipelineBusy: boolean;
  pipelineFailed: boolean;
  refineControls?: ProjectVariantsRefineControls | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ProjectVariantsResults({
  projectTitle,
  variants,
  styleByVariantId,
  selectedVariantId,
  onSelectVariant,
  selectedVariant,
  selectedStyleLabel,
  previewUrl,
  onRequestDeleteVariant,
  pipelineJob,
  pipelineBusy,
  pipelineFailed,
  refineControls,
  onRefresh,
  refreshing = false,
}: ProjectVariantsResultsProps) {
  const [modifyOpen, setModifyOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const latestDoneVariantId = useMemo(() => {
    const done = variants.filter((v) => v.status === 'done');
    if (!done.length) return null;
    return done.reduce((best, row) =>
      new Date(row.created_at) > new Date(best.created_at) ? row : best,
    ).id;
  }, [variants]);

  const selectedIndex = useMemo(
    () => variants.findIndex((v) => v.id === selectedVariantId),
    [variants, selectedVariantId],
  );
  const galleryScrollable = variants.length > 6;

  useEffect(() => {
    if (selectedVariantId == null || !galleryRef.current) return;
    const node = galleryRef.current.querySelector(`[data-variant-id="${selectedVariantId}"]`);
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedVariantId]);

  const goPrevVariant = () => {
    if (selectedIndex <= 0) return;
    onSelectVariant(variants[selectedIndex - 1]!.id);
  };
  const goNextVariant = () => {
    if (selectedIndex < 0 || selectedIndex >= variants.length - 1) return;
    onSelectVariant(variants[selectedIndex + 1]!.id);
  };

  return (
    <section className="min-w-0 flex-1 space-y-4">
      {variants.length === 0 ? (
        pipelineJob ? (
          <div className="space-y-3">
            {onRefresh ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                  disabled={refreshing}
                  aria-label="Refresh"
                  title="Refresh"
                  onClick={() => onRefresh()}
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                </Button>
              </div>
            ) : null}
            <ProjectVariantsPipelineProgress
              pipelineJob={pipelineJob}
              pipelineBusy={pipelineBusy}
              pipelineFailed={pipelineFailed}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="relative flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              {onRefresh ? (
                <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                    disabled={refreshing}
                    aria-label="Refresh"
                    title="Refresh"
                    onClick={() => onRefresh()}
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                  </Button>
                </div>
              ) : null}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"
                aria-hidden
              >
                <ImageIcon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold tracking-tight text-foreground">No variants yet</p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Pick a template on the left (optional), set face if you want, then{' '}
                  <strong className="text-foreground/90">Generate thumbnails</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-[1.5rem] bg-card/70 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.025]">
            <div className="relative aspect-video max-h-[min(70vh,520px)] w-full bg-muted">
              {previewUrl ? (
                <div
                  key={selectedVariantId}
                  className="vt-preview-reveal flex h-full w-full items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Selected thumbnail for ${projectTitle}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : selectedVariant ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  {selectedVariant.status === 'failed' ? (
                    <span>{selectedVariant.error_message ?? 'Generation failed'}</span>
                  ) : (
                    <span>No image yet ({selectedVariant.status})</span>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-background/22 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {selectedStyleLabel ? (
                  <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-xs font-medium text-foreground/85 ring-1 ring-white/[0.04]">
                    {selectedStyleLabel}
                  </span>
                ) : null}
              </div>
              <div className="ml-auto flex items-center gap-0.5 rounded-xl bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]">
                {previewUrl && selectedVariant?.status === 'done' && refineControls && selectedVariantId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg text-foreground hover:bg-white/[0.08]"
                    disabled={pipelineBusy || refineControls.applyPending}
                    aria-label="Modify thumbnail"
                    title="Modify"
                    onClick={() => setModifyOpen(true)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download thumbnail"
                    title="Download"
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors',
                      'hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                    )}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
                {selectedVariant ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg text-destructive/85 hover:bg-destructive/12 hover:text-destructive"
                    aria-label="Delete thumbnail"
                    title="Delete"
                    onClick={() => onRequestDeleteVariant(selectedVariant.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-foreground">Generation history</span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
                  {variants.length}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {onRefresh ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled={refreshing}
                    aria-label="Refresh thumbnails"
                    title="Refresh"
                    onClick={() => onRefresh()}
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                  </Button>
                ) : null}
                {variants.length > 1 ? (
                  <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                      disabled={selectedIndex <= 0}
                      aria-label="Previous version"
                      onClick={goPrevVariant}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Button>
                    <span className="min-w-[3.25rem] select-none text-center text-[11px] tabular-nums text-muted-foreground">
                      {selectedIndex >= 0 ? `${selectedIndex + 1} / ${variants.length}` : '—'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                      disabled={selectedIndex < 0 || selectedIndex >= variants.length - 1}
                      aria-label="Next version"
                      onClick={goNextVariant}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <div
              ref={galleryRef}
              className={cn(
                'rounded-2xl border border-white/[0.06] bg-black/[0.2] p-3 sm:p-4',
                galleryScrollable &&
                  'max-h-[min(46vh,420px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]',
              )}
            >
              <div className="grid grid-cols-2 justify-items-center gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {variants.map((v, i) => (
                  <div key={v.id} data-variant-id={v.id} className="flex w-full max-w-[11rem] justify-center">
                    <VariantStripThumb
                      enterIndex={Math.min(i, 8)}
                      versionIndex={i + 1}
                      variant={v}
                      projectTitle={projectTitle}
                      styleLabel={styleByVariantId.get(v.id)}
                      selected={v.id === selectedVariantId}
                      isLatestDone={v.status === 'done' && v.id === latestDoneVariantId}
                      density="compact"
                      onSelect={() => onSelectVariant(v.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {refineControls && selectedVariantId ? (
            <ProjectVariantModifyModal
              open={modifyOpen}
              onOpenChange={setModifyOpen}
              projectTitle={projectTitle}
              selectedVariantId={selectedVariantId}
              previewUrl={previewUrl}
              canRefine={Boolean(selectedVariant?.status === 'done')}
              refineControls={refineControls}
              pipelineBusy={pipelineBusy}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
