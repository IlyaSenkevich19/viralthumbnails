import { memo } from 'react';

export const CreateHubHeader = memo(function CreateHubHeader() {
  return (
    <div className="max-w-3xl">
      <h2
        id="dashboard-create-heading"
        className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        Create <span className="text-primary">thumbnails</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Choose a source to start generation.</p>
    </div>
  );
});
