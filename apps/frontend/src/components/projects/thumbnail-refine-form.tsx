'use client';

import { useEffect, useId, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VARIANT_REFINE_CREDIT_COST } from '@/config/credits';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import { cn } from '@/lib/utils';

const MIN_CHARS = 8;

export type ThumbnailRefineFormProps = {
  variantId: string | null;
  creditsBalance?: number | null;
  pipelineBusy: boolean;
  refsActiveDescription: boolean;
  applyPending: boolean;
  /** `compact` trims chrome for modal step-two / embedded panels; `studio` = minimal chrome beside a preview column */
  layout?: 'full' | 'compact' | 'studio';
  /** Optional label for submit (e.g. "Apply edits" vs "Generate") */
  submitLabel?: string;
  submitPendingLabel?: string;
  onApply: (instruction: string) => void;
};

export function ThumbnailRefineForm({
  variantId,
  creditsBalance,
  pipelineBusy,
  refsActiveDescription,
  applyPending,
  layout = 'full',
  submitLabel = 'Apply edits',
  submitPendingLabel = 'Applying…',
  onApply,
}: ThumbnailRefineFormProps) {
  const textareaId = useId();
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    setInstruction('');
  }, [variantId]);

  const trimmedLen = instruction.trim().length;
  const canSubmit = Boolean(variantId && trimmedLen >= MIN_CHARS && !applyPending && !pipelineBusy);

  if (!variantId) return null;

  return (
    <div className={cn(layout === 'compact' || layout === 'studio' ? 'space-y-3' : 'space-y-4')}>
      {layout === 'studio' ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-foreground">What should change?</h3>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
            {VARIANT_REFINE_CREDIT_COST} credit
          </span>
        </div>
      ) : null}
      {layout === 'compact' ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/22"
              aria-hidden
            >
              <Wand2 className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Instructions for this version</h3>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
                {VARIANT_REFINE_CREDIT_COST} credit
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Saves a new version; you can revert by picking an older thumbnail on the previous step.{` `}
            {refsActiveDescription ? (
              <>Template / face on the left are sent as hints.</>
            ) : (
              <>
                Optionally set template or face on the left before applying for layout or likeness cues.
              </>
            )}
          </p>
        </>
      ) : layout === 'studio' ? null : (
        <div className="flex flex-wrap items-start gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/22"
            aria-hidden
          >
            <Wand2 className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Describe your edit</h3>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.06]">
                {VARIANT_REFINE_CREDIT_COST} credit
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Applies to the thumbnail selected in history above. Saves a brand-new version—you can switch back anytime.
              {refsActiveDescription ? (
                <> Template / face picks on the left are sent as hints.</>
              ) : (
                <> Add template or face on the left for extra layout or likeness cues.</>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor={textareaId} className="sr-only">
          Refinement instructions
        </label>
        <textarea
          id={textareaId}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make the headline shorter, shift yellow text to the top-right, darken the background…"
          disabled={pipelineBusy || applyPending}
          rows={layout === 'studio' ? 5 : 4}
          className={cn(
            'focus-visible:border-ring focus-visible:ring-ring/40 w-full resize-y rounded-2xl border border-white/[0.08] bg-black/40 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/65',
            'transition-[border-color,box-shadow] duration-150',
            layout === 'studio' ? 'min-h-[7.5rem]' : 'min-h-[6rem]',
            applyPending ? 'opacity-75' : 'focus-visible:ring-2',
          )}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground/90">
            {trimmedLen < MIN_CHARS ? (
              <>
                Minimum <span className="tabular-nums text-foreground/80">{MIN_CHARS}</span> characters
              </>
            ) : (
              <span className="text-emerald-400/90">Ready to apply</span>
            )}
          </p>
          <Button
            type="button"
            size={layout === 'studio' ? 'lg' : 'default'}
            className={cn(
              'shrink-0 rounded-xl font-semibold shadow-[0_12px_36px_-18px_rgba(255,59,59,0.75)]',
              layout === 'studio' ? 'h-11 w-full px-6 sm:w-auto sm:min-w-[180px]' : 'h-10 px-5',
            )}
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              if (
                !assertSufficientCredits({
                  balance: creditsBalance ?? undefined,
                  cost: VARIANT_REFINE_CREDIT_COST,
                })
              ) {
                return;
              }
              onApply(instruction.trim());
            }}
          >
            {applyPending ? submitPendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
