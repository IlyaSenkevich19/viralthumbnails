'use client';

import { memo } from 'react';
import { InfoHint } from '@/components/ui/info-hint';

type Props = {
  creative: string;
  onCreativeChange: (value: string) => void;
  describeError: string;
};

export const PromptModePanel = memo(function PromptModePanel({ creative, onCreativeChange, describeError }: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <label htmlFor="dash-prompt" className="min-w-0 text-sm font-medium leading-tight text-foreground">
            Prompt details
          </label>
          <InfoHint
            buttonLabel="What to put in the prompt"
            helpBody={
              <p>
                Mention subject matter, headline text-on-thumbnail cues, palette, mood, framing, composition, faces to
                include or omit—anything downstream layout models can interpret faithfully.
              </p>
            }
          />
        </div>
      </div>
      <textarea
        id="dash-prompt"
        rows={5}
        placeholder="Describe layout, colors, mood, text on thumbnail…"
        value={creative}
        onChange={(e) => onCreativeChange(e.target.value)}
        aria-invalid={Boolean(describeError)}
        aria-label="Prompt"
        className="min-h-[9.5rem] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p
        className="min-h-5 text-sm text-destructive"
        role={describeError ? 'alert' : undefined}
        aria-live="polite"
      >
        {describeError || ' '}
      </p>
    </div>
  );
});
