'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { statusToneClass } from '@/lib/status-tone';
import type { ThumbnailVariantRow } from '@/lib/types/project';

type VariantStripThumbProps = {
  variant: ThumbnailVariantRow;
  projectTitle: string;
  styleLabel?: string;
  selected: boolean;
  onSelect: () => void;
  enterIndex: number;
};

export function VariantStripThumb({
  variant,
  projectTitle,
  styleLabel,
  selected,
  onSelect,
  enterIndex,
}: VariantStripThumbProps) {
  const url = variant.generated_image_url;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(enterIndex, 24) * 42}ms` }}
      className={cn(
        'vt-variant-enter relative w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-[border-color,box-shadow]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary shadow-sm shadow-primary/10 focus-visible:ring-primary/50'
          : 'border-border/50 hover:border-border focus-visible:ring-ring',
      )}
    >
      <div className="aspect-video w-full">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
            {variant.status}
          </div>
        )}
      </div>
      <Badge
        variant="default"
        className={cn(
          'absolute bottom-1 right-1 px-1.5 py-0 text-[10px] capitalize',
          statusToneClass(variant.status),
        )}
      >
        {variant.status}
      </Badge>
      {styleLabel ? (
        <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/95">
          {styleLabel}
        </span>
      ) : null}
      <span className="sr-only">Select variant for {projectTitle}</span>
    </button>
  );
}
