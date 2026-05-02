'use client';

import { cn } from '@/lib/utils';
import type { ThumbnailVariantRow } from '@/lib/types/project';

type VariantStripThumbProps = {
  variant: ThumbnailVariantRow;
  projectTitle: string;
  /** 1-based order in project history */
  versionIndex: number;
  styleLabel?: string;
  selected: boolean;
  onSelect: () => void;
  enterIndex: number;
  /** Newest successfully generated variant (helps find latest after refining) */
  isLatestDone?: boolean;
  /** Tighter card for grid / dense galleries */
  density?: 'default' | 'compact';
  className?: string;
};

export function VariantStripThumb({
  variant,
  projectTitle,
  versionIndex,
  styleLabel,
  selected,
  onSelect,
  enterIndex,
  isLatestDone,
  density = 'default',
  className,
}: VariantStripThumbProps) {
  const url = variant.generated_image_url;
  const showStatus = variant.status !== 'done';

  const compact = density === 'compact';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      style={{ animationDelay: `${Math.min(enterIndex, 12) * 32}ms` }}
      className={cn(
        'vt-variant-enter group relative shrink-0 overflow-hidden rounded-2xl border-2 bg-card/35 text-left transition-[background,border-color,box-shadow,transform]',
        compact ? 'w-full max-w-[9.25rem] sm:max-w-[10rem]' : 'w-36',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'border-primary/90 bg-primary/[0.12] ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
          : 'border-white/[0.1] hover:border-white/22 hover:bg-white/[0.04]',
        className,
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
        {selected ? (
          <span
            className={cn(
              'pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded-full bg-primary/92 font-semibold uppercase tracking-wide text-primary-foreground shadow-sm ring-1 ring-white/20',
              compact ? 'px-1.5 py-px text-[8px]' : 'left-2 top-2 px-2 py-0.5 text-[10px]',
            )}
          >
            Selected
          </span>
        ) : null}
        {isLatestDone && !selected && !showStatus ? (
          <span
            className={cn(
              'pointer-events-none absolute z-[2] rounded-full bg-emerald-500/85 font-semibold uppercase tracking-wide text-emerald-50 shadow-sm ring-1 ring-emerald-300/35',
              compact ? 'right-1 top-1 px-1.5 py-px text-[8px]' : 'right-2 top-2 px-2 py-0.5 text-[9px]',
            )}
          >
            Latest
          </span>
        ) : null}
        {showStatus ? (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 z-[2] rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize backdrop-blur',
              variant.status === 'failed'
                ? 'bg-warning/90 text-black shadow-sm ring-1 ring-warning/35'
                : 'bg-background/75 text-muted-foreground',
            )}
          >
            {variant.status}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'flex items-center gap-1.5 bg-black/25 px-2',
          compact ? 'min-h-[2rem] py-1.5' : 'min-h-[2.5rem] gap-2 px-2.5 py-2',
        )}
      >
        <span
          className={cn(
            'shrink-0 rounded-md bg-white/[0.07] font-semibold tabular-nums text-foreground/80 ring-1 ring-white/[0.06]',
            compact ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]',
          )}
        >
          v{versionIndex}
        </span>
        {styleLabel ? (
          <span
            className={cn(
              'truncate font-medium text-foreground/85',
              compact ? 'text-[10px]' : 'text-[11px]',
            )}
          >
            {styleLabel}
          </span>
        ) : (
          <span className={cn('truncate text-muted-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
            Thumbnail
          </span>
        )}
      </div>
      <span className="sr-only">
        {styleLabel ?? 'Variant'} version {versionIndex}, {projectTitle}.{selected ? ' Currently selected.' : ''} Press Enter
        or Space to show in preview.
      </span>
    </button>
  );
}
