import { memo } from 'react';

type Props = {
  creative: string;
  onCreativeChange: (value: string) => void;
  describeError: string;
};

export const PromptModePanel = memo(function PromptModePanel({ creative, onCreativeChange, describeError }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="dash-prompt" className="text-sm font-medium text-foreground">
        Prompt
      </label>
      <textarea
        id="dash-prompt"
        rows={5}
        placeholder="Describe layout, colors, mood, text on thumbnail…"
        value={creative}
        onChange={(e) => onCreativeChange(e.target.value)}
        aria-invalid={Boolean(describeError)}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {describeError ? (
        <p className="text-sm text-destructive" role="alert">
          {describeError}
        </p>
      ) : null}
    </div>
  );
});
