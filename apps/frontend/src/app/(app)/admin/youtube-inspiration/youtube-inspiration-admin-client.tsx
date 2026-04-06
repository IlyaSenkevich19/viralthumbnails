'use client';

import { SetPageFrame } from '@/components/layout/set-page-frame';
import { YoutubeInspirationSection } from '@/components/templates/youtube-inspiration-section';

export function YoutubeInspirationAdminClient() {
  return (
    <div className="space-y-6">
      <SetPageFrame eyebrow="Admin" title="YouTube inspiration" />
      <YoutubeInspirationSection />
    </div>
  );
}
