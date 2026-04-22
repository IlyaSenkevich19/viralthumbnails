import { memo } from 'react';
import { dashboardCreateModes } from '../dashboard-create-hub.utils';
import type { HubMode } from '../dashboard-create-hub.utils';
import { cn } from '@/lib/utils';

type Props = {
  mode: HubMode;
  onModeChange: (id: HubMode) => void;
};

export const CreateHubModeTabs = memo(function CreateHubModeTabs({ mode, onModeChange }: Props) {
  return (
    <>
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="How you provide context"
      >
        {dashboardCreateModes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => onModeChange(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Tip:</span> Prompt is the fastest first try. YouTube and Video
        add more context when you need it.
      </p>
    </>
  );
});
