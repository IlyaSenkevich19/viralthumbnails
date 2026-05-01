'use client';

import { cn } from '@/lib/utils';
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
  const showStatus = variant.status !== 'done';

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(enterIndex, 24) * 42}ms` }}
      className={cn(
        'vt-variant-enter group relative w-36 shrink-0 overflow-hidden rounded-2xl border-2 bg-card/35 text-left transition-[background,border-color,transform]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary/80 bg-primary/10'
          : 'border-white/[0.1] hover:border-white/22 hover:bg-white/[0.04]',
      )}
    >
      <div className="relative isolate aspect-video w-full overflow-hidden bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="relative flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
            {variant.status}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
        {showStatus ? (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 z-[2] rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize backdrop-blur',
              variant.status === 'failed'
                ? 'bg-destructive/85 text-destructive-foreground'
                : 'bg-background/75 text-muted-foreground',
            )}
          >
            {variant.status}
          </span>
        ) : null}
      </div>
      {styleLabel ? (
        <span className="block truncate bg-black/25 px-2.5 py-2 text-[11px] font-medium text-foreground/85">
          {styleLabel}
        </span>
      ) : null}
      <span className="sr-only">Select variant for {projectTitle}</span>
    </button>
  );
}
