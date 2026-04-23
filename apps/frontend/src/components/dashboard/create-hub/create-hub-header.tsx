import { memo } from 'react';

export const CreateHubHeader = memo(function CreateHubHeader() {
  return (
    <div className="max-w-3xl">
      <h2 id="dashboard-create-heading" className="sr-only">
        Create thumbnails
      </h2>
      <p className="text-sm text-muted-foreground">Choose a source to start generation.</p>
    </div>
  );
});
