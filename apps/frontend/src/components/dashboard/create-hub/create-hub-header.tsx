'use client';

import { memo } from 'react';
import { InfoHint } from '@/components/ui/info-hint';

export const CreateHubHeader = memo(function CreateHubHeader() {
  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <h2
          id="dashboard-create-heading"
          className="min-w-0 text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl"
        >
          Inputs for <span className="text-primary">generation</span>
        </h2>
        <InfoHint
          buttonLabel="About generator inputs layout"
          className="shrink-0"
          helpBody={
            <p>
              Choose a prompt, upload a recording, or paste a YouTube URL. Whatever you pick, downstream steps prioritize
              a large thumbnail preview—even on narrower screens—to keep judgments visual first.
            </p>
          }
        />
      </div>
    </div>
  );
});
