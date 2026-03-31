'use client';

import { YoutubeInspirationSection } from '@/components/templates/youtube-inspiration-section';

export function YoutubeInspirationAdminClient() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">YouTube inspiration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Internal tool for browsing high-view-count thumbnails and curating assets for Storage. Uses your YouTube Data
          API quota; not shown to regular users.
        </p>
      </div>
      <YoutubeInspirationSection />
    </div>
  );
}
