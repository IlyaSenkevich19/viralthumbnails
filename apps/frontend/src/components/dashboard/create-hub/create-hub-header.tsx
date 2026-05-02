import { memo } from 'react';

export const CreateHubHeader = memo(function CreateHubHeader() {
  return (
    <div className="max-w-3xl">
      <h2
        id="dashboard-create-heading"
        className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        Inputs for <span className="text-primary">generation</span>
      </h2>
      <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
        Prompt, recording, or YouTube URL. Next steps keep thumbnail previews large on small screens too.
      </p>
    </div>
  );
});
