'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onGenerateCountChange: (count: number) => void;
  onGenerate: () => void;
  generatePending: boolean;
  pipelineBusy: boolean;
  canGenerate: boolean;
  generateLabel: string;
};

export function ProjectVariantsGeneratePanel({
  avatars,
  selectedAvatarId,
  onAvatarChange,
  prioritizeFace,
  onPrioritizeFaceChange,
  templateFaceFilter,
  generateCount,
  onGenerateCountChange,
  onGenerate,
  generatePending,
  pipelineBusy,
  canGenerate,
  generateLabel,
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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Output</h2>
            <p className="text-xs text-muted-foreground">Choose how many distinct directions to generate.</p>
          </div>
          <p className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {generateCount} credit{generateCount === 1 ? '' : 's'}
          </p>
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
      </div>

      <details className="group rounded-2xl bg-muted/25">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors marker:hidden hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70">
          <span>Advanced character settings</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 px-3 pb-3 pt-2">
          <div className="space-y-1.5">
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
            <div className="min-w-0">
              <span className="text-sm font-medium text-foreground">Prioritize likeness</span>
              <p className="text-xs text-muted-foreground">{helperText}</p>
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

      <div className="sticky bottom-2 z-10 rounded-[1.35rem] bg-[radial-gradient(ellipse_at_top_right,rgba(255,59,59,0.16),transparent_50%),rgba(18,23,32,0.94)] p-3 shadow-[0_22px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
        <Button
          type="button"
          className="relative h-12 w-full gap-2 text-base font-semibold"
          onClick={onGenerate}
          disabled={generatePending || !canGenerate}
        >
          {generateLabel}
          <span className="ml-auto text-xs font-normal opacity-90">
            {generateCount} credit{generateCount === 1 ? '' : 's'}
          </span>
        </Button>
        {pipelineBusy ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Video analysis is running. Generation unlocks when it finishes.
          </p>
        ) : null}
      </div>
    </section>
  );
}
