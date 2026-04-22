'use client';

import { useIsMutating } from '@tanstack/react-query';
import {
  THUMBNAIL_PIPELINE_RUN_MUTATION_KEY,
  THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY,
} from '@/lib/hooks/pipeline-mutation-keys';
import { usePipelineJobActivity } from '@/contexts/pipeline-job-activity-context';

/**
 * Merges in-tab React Query pipeline mutations (dashboard / modal) with app-shell
 * recovery state so the header and optional banners can show a single “in progress” line.
 */
export function usePipelineJobSurface() {
  const { activityLabel, isRecovering } = usePipelineJobActivity();
  const runActive = useIsMutating({ mutationKey: [...THUMBNAIL_PIPELINE_RUN_MUTATION_KEY] }) > 0;
  const videoActive = useIsMutating({ mutationKey: [...THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY] }) > 0;

  const labelFromMutation =
    runActive && videoActive
      ? 'Processing'
      : runActive
        ? 'Generating thumbnails'
        : videoActive
          ? 'Processing video'
          : null;

  const label = activityLabel ?? labelFromMutation ?? (isRecovering ? 'Resuming' : null);
  const active = Boolean(label) || isRecovering;

  return { label, active, isRecovering, runActive, videoActive };
}
