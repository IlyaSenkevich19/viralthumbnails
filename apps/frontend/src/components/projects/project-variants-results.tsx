'use client';

import { Download, ImageIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ThumbnailVariantRow } from '@/lib/types/project';
import { VariantStripThumb } from '@/components/projects/project-variant-strip-thumb';

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
      ) : (
        <>
          <div className="surface overflow-hidden">
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
            <div className="flex flex-wrap gap-2 border-t border-border p-3">
              {selectedStyleLabel ? (
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/90">
                  {selectedStyleLabel}
                </span>
              ) : null}
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex gap-2')}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </a>
              ) : null}
              <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                Advanced edit tools coming soon
              </span>
              {selectedVariant ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                  onClick={() => onRequestDeleteVariant(selectedVariant.id)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">All variants</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
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
