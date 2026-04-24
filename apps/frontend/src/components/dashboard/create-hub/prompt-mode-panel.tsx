import { memo } from 'react';

type Props = {
  creative: string;
  onCreativeChange: (value: string) => void;
  describeError: string;
};

export const PromptModePanel = memo(function PromptModePanel({ creative, onCreativeChange, describeError }: Props) {
  return (
    <div className="flex h-full flex-col">
      <label htmlFor="dash-prompt" className="mb-1 text-sm font-medium text-foreground">
        Prompt details
      </label>
      <p className="mb-2 text-xs text-muted-foreground">
        Describe subject, text hook, mood, and layout direction.
      </p>
      <textarea
        id="dash-prompt"
        rows={5}
        placeholder="Describe layout, colors, mood, text on thumbnail…"
        value={creative}
        onChange={(e) => onCreativeChange(e.target.value)}
        aria-invalid={Boolean(describeError)}
        aria-label="Prompt"
        className="min-h-[9.5rem] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p
        className="mt-1.5 min-h-5 text-sm text-destructive"
        role={describeError ? 'alert' : undefined}
        aria-live="polite"
      >
        {describeError || ' '}
      </p>
    </div>
  );
});
