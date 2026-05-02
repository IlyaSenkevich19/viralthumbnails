'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, ImageIcon, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/empty-state';
import { InfoHint } from '@/components/ui/info-hint';
import type { ThumbnailVariantRow } from '@/lib/types/project';
import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';
import { VariantStripThumb } from '@/components/projects/project-variant-strip-thumb';
import { ProjectVariantModifyModal } from '@/components/projects/project-variant-modify-modal';
import type { ProjectVariantsRefineControls } from '@/components/projects/project-variants-refine.types';
import { cn } from '@/lib/utils';
import { vtSpring } from '@/lib/motion-presets';
import { ProjectVariantsPipelineProgress } from '@/components/projects/project-variants-pipeline-progress';

export type { ProjectVariantsRefineControls } from '@/components/projects/project-variants-refine.types';

const VARIANT_KB_SUMMARY_ID = 'vt-variant-kbd-summary';
const VARIANT_KB_SR_TEXT =
  'When focus is anywhere in thumbnail results—including the preview, thumbnails, or controls below—press Left Arrow or Right Arrow to change the selected variant. Home jumps to the first variant and End jumps to the last.';

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
  const reduceMotion = useReducedMotion();
  const [modifyOpen, setModifyOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
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
    node?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [selectedVariantId, reduceMotion]);

  const goPrevVariant = useCallback(() => {
    if (selectedIndex <= 0) return;
    onSelectVariant(variants[selectedIndex - 1]!.id);
  }, [onSelectVariant, selectedIndex, variants]);

  const goNextVariant = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= variants.length - 1) return;
    onSelectVariant(variants[selectedIndex + 1]!.id);
  }, [onSelectVariant, selectedIndex, variants]);

  const handleCompareKeyNav = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (variants.length < 2) return;
      const key = e.key;
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
      const el = e.target as HTMLElement | null;
      if (!el?.closest) return;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!sectionRef.current?.contains(el)) return;

      if (key === 'Home') {
        e.preventDefault();
        onSelectVariant(variants[0]!.id);
        return;
      }
      if (key === 'End') {
        e.preventDefault();
        onSelectVariant(variants[variants.length - 1]!.id);
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedIndex > 0) onSelectVariant(variants[selectedIndex - 1]!.id);
        return;
      }
      if (key === 'ArrowRight') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < variants.length - 1) {
          onSelectVariant(variants[selectedIndex + 1]!.id);
        }
      }
    },
    [onSelectVariant, selectedIndex, variants],
  );

  const previewAlt = useMemo(() => {
    const scope = selectedStyleLabel ? `${selectedStyleLabel} variant` : 'Selected thumbnail';
    return `${scope} for ${projectTitle}`;
  }, [projectTitle, selectedStyleLabel]);

  return (
    <section
      ref={sectionRef}
      className="min-w-0 flex-1 space-y-4"
      aria-label={`Thumbnail preview and history for ${projectTitle}`}
      onKeyDownCapture={handleCompareKeyNav}
    >
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
          <EmptyStateCard
            cardClassName="relative min-h-[220px]"
            icon={<ImageIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
            title="No variants yet"
            description={
              <>
                Pick a template in the left stack (optional), tune character settings, then run{' '}
                <strong className="font-semibold text-foreground">Generate thumbnails</strong>—variants land in the
                rail below.
              </>
            }
          >
            {onRefresh ? (
              <div className="pointer-events-none absolute right-3 top-3 flex justify-end sm:right-4 sm:top-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                  disabled={refreshing}
                  aria-label="Refresh"
                  title="Refresh"
                  onClick={() => onRefresh()}
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                </Button>
              </div>
            ) : null}
          </EmptyStateCard>
        )
      ) : (
        <>
          <div className="overflow-hidden rounded-[1.5rem] bg-card/70 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.025]">
            <div
              className={cn(
                'relative aspect-video max-h-[min(70dvh,520px)] w-full bg-muted',
                'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/55',
              )}
              tabIndex={0}
              role="group"
              aria-label={previewAlt}
              aria-describedby={variants.length > 1 ? VARIANT_KB_SUMMARY_ID : undefined}
            >
              {previewUrl ? (
                <motion.div
                  key={selectedVariantId}
                  className="vt-preview-reveal flex h-full w-full items-center justify-center"
                  initial={reduceMotion ? false : { opacity: 0.88, scale: 0.992 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduceMotion ? { duration: 0 } : vtSpring.enter}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={previewAlt}
                    className="max-h-full max-w-full object-contain"
                  />
                </motion.div>
              ) : selectedVariant ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm">
                  {selectedVariant.status === 'failed' ? (
                    <span className="max-w-md text-warning">
                      {selectedVariant.error_message ?? 'Generation failed'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      No image yet ({selectedVariant.status})
                    </span>
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
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-destructive/12 hover:text-destructive"
                    aria-label="Delete thumbnail…"
                    title="Delete thumbnail…"
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
                <span
                  id="vt-variant-gallery-label"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Generation history
                </span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
                  {variants.length}
                </span>
                {variants.length > 1 ? (
                  <InfoHint
                    className="-mb-px"
                    anchorId={VARIANT_KB_SUMMARY_ID}
                    srSummary={VARIANT_KB_SR_TEXT}
                    buttonLabel="Keyboard shortcuts for comparing variants"
                  >
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-foreground">
                        Navigate without leaving the layout
                      </p>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Keep focus inside this column (preview, thumbnails, or the controls here), then use:
                      </p>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px] text-foreground/90">
                        <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">←</kbd>
                        <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">→</kbd>
                        <span className="self-center px-1 text-muted-foreground">switch</span>
                        <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">Home</kbd>
                        <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5">End</kbd>
                        <span className="self-center px-1 text-muted-foreground">first / last</span>
                      </div>
                    </div>
                  </InfoHint>
                ) : null}
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
                      aria-label="Previous variant"
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
                      aria-label="Next variant"
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
              aria-label="Thumbnail variant grid — compare with arrows when preview is focused."
              aria-labelledby="vt-variant-gallery-label"
              className={cn(
                'rounded-2xl border border-white/[0.06] bg-black/[0.2] p-3 sm:p-4',
                galleryScrollable &&
                  'max-h-[min(46dvh,420px)] overflow-y-auto overscroll-contain [scrollbar-width:thin]',
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
