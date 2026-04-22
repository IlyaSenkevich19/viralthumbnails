import { memo } from 'react';

type Props = {
  plannedStyleCount: number;
  plannedStyles: string[];
};

export const PlannedStylesPreview = memo(function PlannedStylesPreview({
  plannedStyleCount,
  plannedStyles,
}: Props) {
  return (
    <div className="mt-5 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Planned styles ({plannedStyleCount})
      </p>
      <div className="flex flex-wrap gap-2">
        {plannedStyles.map((style, i) => (
          <span
            key={`${style}-${i}`}
            className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-foreground/90"
          >
            {style}
          </span>
        ))}
      </div>
    </div>
  );
});
