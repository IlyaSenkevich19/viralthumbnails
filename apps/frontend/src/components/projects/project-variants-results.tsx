'use client';

import { Download, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ThumbnailVariantRow } from '@/lib/types/project';
import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';
import { VariantStripThumb } from '@/components/projects/project-variant-strip-thumb';
import { ProjectVariantsPipelineProgress } from '@/components/projects/project-variants-pipeline-progress';

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
}: ProjectVariantsResultsProps) {
  return (
    <section className="min-w-0 flex-1 space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Generated thumbnails ({variants.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {variants.length > 0
            ? 'Select a thumbnail below to preview. Open in a new tab or download when ready.'
            : 'Run generation from the left. New variants will show up here.'}
        </p>
      </div>

      {variants.length === 0 ? (
        pipelineJob ? (
          <ProjectVariantsPipelineProgress
            pipelineJob={pipelineJob}
            pipelineBusy={pipelineBusy}
            pipelineFailed={pipelineFailed}
          />
        ) : (
          <Card>
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
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
            <div className="flex flex-wrap items-center gap-2 bg-background/22 px-3 py-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {selectedStyleLabel ? (
                  <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-xs font-medium text-foreground/85 ring-1 ring-white/[0.04]">
                    {selectedStyleLabel}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">Advanced editing is coming soon</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/[0.065] px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.095] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Download
                  </a>
                ) : null}
                {selectedVariant ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-full px-3 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onRequestDeleteVariant(selectedVariant.id)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">All variants</p>
              <p className="text-xs text-muted-foreground">{variants.length} generated</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {variants.map((v, i) => (
                <VariantStripThumb
                  key={v.id}
                  enterIndex={i}
                  variant={v}
                  projectTitle={projectTitle}
                  styleLabel={styleByVariantId.get(v.id)}
                  selected={v.id === selectedVariantId}
                  onSelect={() => onSelectVariant(v.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
