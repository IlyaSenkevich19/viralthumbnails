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
        'vt-variant-enter group w-36 shrink-0 rounded-2xl p-1 text-left transition-[background,box-shadow,transform]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        selected
          ? 'bg-primary/12 shadow-[0_16px_42px_-28px_rgba(255,59,59,0.85)] ring-1 ring-primary/45'
          : 'bg-white/[0.025] ring-1 ring-white/[0.045] hover:bg-white/[0.045]',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
            {variant.status}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
        {showStatus ? (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize backdrop-blur',
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
        <span className="mt-1.5 block truncate px-1 text-[11px] font-medium text-foreground/85">
          {styleLabel}
        </span>
      ) : null}
      <span className="sr-only">Select variant for {projectTitle}</span>
    </button>
  );
}
