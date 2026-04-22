import { memo } from 'react';

export const CreateHubHeader = memo(function CreateHubHeader() {
  return (
    <div className="max-w-3xl">
      <h2
        id="dashboard-create-heading"
        className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        Create <span className="text-primary">thumbnails</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a starting point below. Template, face, and extra video styling stay under{' '}
        <span className="font-medium text-foreground/90">More options</span> until you need them.
      </p>
    </div>
  );
});
