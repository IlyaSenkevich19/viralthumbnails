'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfoHint } from '@/components/ui/info-hint';

export type SectionHeadingProps = {
  /** Visible title column (typically a `CardTitle` or `<h3>…`). */
  title: ReactNode;
  /** Accessible label for the help trigger. */
  helpLabel: string;
  /** Rich tooltip contents (muted body styles applied). */
  helpBody: ReactNode;
  srSummary?: string;
  anchorId?: string;
  className?: string;
};

/** Section title paired with compact ⓘ help (consistent pattern across screens). */
export function SectionHeading({ title, helpLabel, helpBody, srSummary, anchorId, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1', className)}>
      <div className="min-w-0">{title}</div>
      <InfoHint
        buttonLabel={helpLabel}
        srSummary={srSummary}
        anchorId={anchorId}
        className="shrink-0"
      >
        <div className="text-[11px] leading-relaxed text-muted-foreground">{helpBody}</div>
      </InfoHint>
    </div>
  );
}
