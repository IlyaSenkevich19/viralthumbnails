'use client';

import type { ReactNode } from 'react';
import { PipelineJobActivityProvider } from '@/contexts/pipeline-job-activity-context';

/** Wraps app routes + modals that submit thumbnail pipeline jobs so recovery and header state stay consistent. */
export function WithPipelineActivity({ children }: { children: ReactNode }) {
  return <PipelineJobActivityProvider>{children}</PipelineJobActivityProvider>;
}
