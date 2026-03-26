'use client';

import { Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { statusToneClass } from '@/lib/status-tone';
import type { ThumbnailVariantRow } from '@/lib/types/project';

type VariantThumbnailCardProps = {
  projectTitle: string;
  variant: ThumbnailVariantRow;
  hasImage: boolean;
  onDelete: () => void;
};

export function VariantThumbnailCard({
  projectTitle,
  variant,
  hasImage,
  onDelete,
}: VariantThumbnailCardProps) {
  const url = variant.generated_image_url;

  return (
    <Card className="overflow-hidden">
      <div className="group relative aspect-video bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Thumbnail variant for ${projectTitle}`}
            className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-[var(--ease-standard)] group-hover:scale-[1.03] group-hover:blur-sm"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted-foreground">
            {variant.status === 'failed' ? (
              <span>{variant.error_message ?? 'Generation failed'}</span>
            ) : (
              <span>No image yet</span>
            )}
          </div>
        )}

        {/* Hover / focus overlay (sm+) */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 hidden flex-col items-center justify-center gap-4 p-4 transition-[background-color,opacity] duration-200 ease-[var(--ease-standard)] sm:flex',
            'bg-black/0 opacity-0',
            'group-hover:bg-black/60 group-hover:opacity-100',
            'group-focus-within:bg-black/60 group-focus-within:opacity-100',
          )}
        >
          <p className="max-w-[90%] text-center text-base font-bold tracking-tight text-white drop-shadow-md">
            {projectTitle}
          </p>
          <div className="pointer-events-auto flex items-center gap-3">
            {hasImage && url ? (
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                title="Download"
                className={cn(
                  'motion-base flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground shadow-lg',
                  'hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
                )}
              >
                <Download className="h-5 w-5" aria-hidden />
                <span className="sr-only">Download</span>
              </a>
            ) : null}
            <button
              type="button"
              title="Delete this variant"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className={cn(
                'motion-base flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35',
                'hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
              )}
            >
              <Trash2 className="h-5 w-5" aria-hidden />
              <span className="sr-only">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / coarse pointer: actions always reachable */}
      <CardContent className="flex flex-col gap-3 border-t border-border/60 p-4 sm:hidden">
        <Badge variant="default" className={cn('w-fit capitalize', statusToneClass(variant.status))}>
          {variant.status}
        </Badge>
        <div className="flex flex-wrap gap-2">
          {hasImage && url ? (
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-md"
            >
              <Download className="h-5 w-5" aria-hidden />
              <span className="sr-only">Download</span>
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
          >
            <Trash2 className="h-5 w-5" aria-hidden />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </CardContent>

      <CardContent className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:py-3">
        <Badge variant="default" className={cn('w-fit capitalize', statusToneClass(variant.status))}>
          {variant.status}
        </Badge>
      </CardContent>
    </Card>
  );
}
