'use client';

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
import { PrimaryActionPanel } from '@/components/ui/primary-action-panel';
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

  const countOptions = Array.from(
    { length: PROJECT_GENERATE_COUNT_MAX - PROJECT_GENERATE_COUNT_MIN + 1 },
    (_, i) => PROJECT_GENERATE_COUNT_MIN + i,
  );

  return (
    <PrimaryActionPanel className="space-y-4 p-4">
      <div className="space-y-1.5">
        <label htmlFor="variant-generate-count" className="text-sm font-medium text-foreground">
          Thumbnails to generate
        </label>
        <Select
          value={String(generateCount)}
          onValueChange={(v) => onGenerateCountChange(Number.parseInt(v, 10) || PROJECT_GENERATE_COUNT_MIN)}
        >
          <SelectTrigger id="variant-generate-count" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} variant{n === 1 ? '' : 's'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Each variant uses a slightly different style direction in the prompt (same topic and template).
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="variant-character" className="text-sm font-medium text-foreground">
          Character (optional)
        </label>
        <Select
          value={selectedAvatarId || SELECT_EMPTY_VALUE}
          onValueChange={(v) => onAvatarChange(v === SELECT_EMPTY_VALUE ? '' : v)}
        >
          <SelectTrigger id="variant-character" className="h-10">
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
        <span className="text-sm text-foreground">Prioritize looking like me</span>
        <button
          type="button"
          role="switch"
          aria-checked={prioritizeFace}
          disabled={faceless || !hasAvatar}
          onClick={() => onPrioritizeFaceChange(!prioritizeFace)}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
      {faceless ? (
        <p className="text-xs text-muted-foreground">
          Faceless: the image prompt avoids people/faces; your character reference is not used.
        </p>
      ) : hasAvatar ? (
        <p className="text-xs text-muted-foreground">
          Your face reference is sent with each generation so the model can match likeness when possible.
        </p>
      ) : null}
      {pipelineBusy ? (
        <p className="text-xs text-muted-foreground">
          Video analysis is in progress. Generation controls unlock when pipeline finishes.
        </p>
      ) : null}
    </PrimaryActionPanel>
  );
}
