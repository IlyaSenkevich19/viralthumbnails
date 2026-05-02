'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InfoHint } from '@/components/ui/info-hint';
import { cn } from '@/lib/utils';
import {
  SELECT_EMPTY_VALUE,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PROJECT_GENERATE_COUNT_MAX,
  PROJECT_GENERATE_COUNT_MIN,
  TEMPLATE_FACE_FILTER,
  type TemplateFaceFilter,
} from '@/components/projects/project-variants-workspace.constants';

type AvatarOption = { id: string; name: string };

type ProjectVariantsGeneratePanelProps = {
  avatars: AvatarOption[];
  selectedAvatarId: string;
  onAvatarChange: (id: string) => void;
  prioritizeFace: boolean;
  onPrioritizeFaceChange: (value: boolean) => void;
  templateFaceFilter: TemplateFaceFilter;
  generateCount: number;
  creditCost: number;
  onGenerateCountChange: (count: number) => void;
  onGenerate: () => void;
  generatePending: boolean;
  pipelineBusy: boolean;
  canGenerate: boolean;
  generateLabel: string;
  /** When known, shows balance vs this run; low balance shows a non-blocking hint (paywall still opens on click). */
  creditsBalance?: number;
  creditsPending?: boolean;
};

export function ProjectVariantsGeneratePanel({
  avatars,
  selectedAvatarId,
  onAvatarChange,
  prioritizeFace,
  onPrioritizeFaceChange,
  templateFaceFilter,
  generateCount,
  creditCost,
  onGenerateCountChange,
  onGenerate,
  generatePending,
  pipelineBusy,
  canGenerate,
  generateLabel,
  creditsBalance,
  creditsPending = false,
}: ProjectVariantsGeneratePanelProps) {
  const faceless = templateFaceFilter === TEMPLATE_FACE_FILTER.faceless;
  const hasAvatar = Boolean(selectedAvatarId.trim());
  const helperText = faceless
    ? 'Faceless mode ignores character references.'
    : hasAvatar
      ? 'Your character reference will guide likeness when possible.'
      : 'Optional: add a character reference for stronger personal branding.';

  const countOptions = Array.from(
    { length: PROJECT_GENERATE_COUNT_MAX - PROJECT_GENERATE_COUNT_MIN + 1 },
    (_, i) => PROJECT_GENERATE_COUNT_MIN + i,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">Output</h2>
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-white/[0.04]"
              title={`This run costs ${creditCost} credit${creditCost === 1 ? '' : 's'}`}
            >
              {creditCost} credit{creditCost === 1 ? '' : 's'}
            </span>
            <InfoHint
              className="shrink-0"
              buttonLabel="Thumbnail count vs credits"
              helpBody={
                <p>
                  Each number corresponds to visually distinct directions we ask the renderer to propose in parallel.
                  Larger batches multiply credit spend upfront because every layout attempt reserves capacity.
                </p>
              }
            />
          </div>
        </div>
        <Select
          value={String(generateCount)}
          onValueChange={(v) => onGenerateCountChange(Number.parseInt(v, 10) || PROJECT_GENERATE_COUNT_MIN)}
        >
          <SelectTrigger id="variant-generate-count" className="h-10 bg-card/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} thumbnail{n === 1 ? '' : 's'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {creditsPending ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Loading credit balance…
          </p>
        ) : typeof creditsBalance === 'number' ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Balance{' '}
              <span className="font-medium tabular-nums text-foreground">{creditsBalance}</span>
              {' · '}
              this run{' '}
              <span className="font-medium tabular-nums text-foreground">{creditCost}</span>
            </p>
            {creditsBalance < creditCost ? (
              <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-200/90" role="status">
                Not enough credits for this batch — choose fewer thumbnails above, or confirm to add packs when
                prompted.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <details className="group rounded-2xl bg-muted/25">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors marker:hidden hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70">
          <span>Advanced character settings</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 px-3 pb-3 pt-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="variant-character" className="text-sm font-medium text-foreground">
              Character reference
            </label>
            <Select
              value={selectedAvatarId || SELECT_EMPTY_VALUE}
              onValueChange={(v) => onAvatarChange(v === SELECT_EMPTY_VALUE ? '' : v)}
            >
              <SelectTrigger id="variant-character" className="h-10 bg-card/60">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-x-1.5 gap-y-1">
              <span className="text-sm font-medium text-foreground">Prioritize likeness</span>
              <InfoHint buttonLabel="How likeness prioritization behaves" helpBody={<p>{helperText}</p>} />
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prioritizeFace}
              disabled={faceless || !hasAvatar}
              onClick={() => onPrioritizeFaceChange(!prioritizeFace)}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                prioritizeFace ? 'bg-primary' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
                  prioritizeFace ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>
      </details>

      <div className="sticky bottom-2 z-10 rounded-2xl border border-border/90 bg-card/92 p-3 shadow-[0_18px_50px_-32px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
        <Button
          type="button"
          className="relative h-12 w-full gap-3 text-base font-semibold hover:translate-y-0 hover:shadow-md"
          onClick={onGenerate}
          disabled={generatePending || !canGenerate}
        >
          {generateLabel}
          <span className="ml-auto text-xs font-normal opacity-90">
            {creditCost} credit{creditCost === 1 ? '' : 's'}
          </span>
        </Button>
        {pipelineBusy ? (
          <p className="mt-2 text-center text-xs text-muted-foreground" role="status">
            Analysis running — unlocks generation when finished.
          </p>
        ) : null}
      </div>
    </section>
  );
}
