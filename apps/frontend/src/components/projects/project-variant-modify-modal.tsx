'use client';

import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { ThumbnailRefineForm } from '@/components/projects/thumbnail-refine-form';
import type { ProjectVariantsRefineControls } from '@/components/projects/project-variants-refine.types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProjectVariantModifyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle: string;
  selectedVariantId: string | null;
  previewUrl: string | null;
  /** Variant is ready to refine (caller usually only opens Modify when done) */
  canRefine: boolean;
  refineControls?: ProjectVariantsRefineControls | null;
  pipelineBusy: boolean;
};

export function ProjectVariantModifyModal({
  open,
  onOpenChange,
  projectTitle,
  selectedVariantId,
  previewUrl,
  canRefine,
  refineControls,
  pipelineBusy,
}: ProjectVariantModifyModalProps) {
  const refinePending = Boolean(refineControls?.applyPending);
  const dialogTitleId = 'modify-thumbnail-dialog-title';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (refinePending) return;
      onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange, refinePending]);

  if (!open) return null;

  const backdropClose = () => {
    if (refinePending) return;
    onOpenChange(false);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[115] flex items-end justify-center sm:items-center',
        'bg-black/70 backdrop-blur-md sm:p-4',
      )}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) backdropClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className={cn(
          'relative flex max-h-[min(94vh,880px)] w-full flex-col overflow-hidden border border-white/[0.09] bg-card shadow-[0_40px_120px_-56px_rgba(0,0,0,0.95)]',
          'motion-base rounded-t-[1.35rem] sm:max-w-6xl sm:rounded-[1.75rem]',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/[0.06] bg-gradient-to-b from-black/30 to-transparent px-4 pb-4 pt-4 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-4">
              <h2 id={dialogTitleId} className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Modify thumbnail
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">{projectTitle}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Close"
              disabled={refinePending}
              onClick={() => backdropClose()}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>

        <div className="relative min-h-[min(360px,48vh)] flex-1 overflow-hidden">
          {refinePending ? (
            <div
              className={cn(
                'absolute inset-0 z-[50] flex flex-col items-center justify-center gap-4 px-6 text-center',
                'rounded-b-[inherit] bg-black/70 backdrop-blur-md',
              )}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-10 w-10 shrink-0 animate-spin text-primary" aria-hidden />
              <p className="text-base font-medium text-foreground">Refining…</p>
            </div>
          ) : null}

          <div className="flex h-full max-h-[min(calc(94vh-10rem),78vh)] flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-7">
              <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
                <aside className="space-y-3 lg:sticky lg:top-0">
                  <div className="overflow-hidden rounded-2xl bg-muted ring-1 ring-white/[0.08] shadow-[0_28px_80px_-48px_rgba(0,0,0,0.85)]">
                    <div className="relative aspect-video w-full bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,59,59,0.1)_0%,transparent_55%),rgba(0,0,0,0.45)]">
                      {previewUrl ? (
                        <div className="flex h-full w-full items-center justify-center p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                  </div>
                </aside>

                <div className="min-w-0">
                  {refineControls && selectedVariantId && canRefine ? (
                    <ThumbnailRefineForm
                      variantId={selectedVariantId}
                      creditsBalance={refineControls.creditsBalance}
                      pipelineBusy={pipelineBusy}
                      refsActiveDescription={Boolean(refineControls.templateId || refineControls.avatarId?.trim())}
                      applyPending={refineControls.applyPending}
                      layout="studio"
                      submitLabel="Refine thumbnail"
                      submitPendingLabel="Refining…"
                      onApply={refineControls.onApply}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/20 px-5 py-10">
                      <p className="text-sm text-muted-foreground">This thumbnail isn’t ready yet.</p>
                      <Button type="button" variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
