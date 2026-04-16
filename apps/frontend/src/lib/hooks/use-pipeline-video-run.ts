'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';
import { toPipelineVideoResponse } from '@/lib/adapters/pipeline-video-response';
import { queryKeys } from '@/lib/query-keys';
import type { PipelineVideoRunRequest } from '@/lib/api/thumbnails';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/api-error';
import {
  handleBillingMutationError,
  handleOpenRouterMutationError,
  handlePipelineVideoDurationError,
} from '@/lib/paywall-notify';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 200;

export function usePipelineVideoRunMutation() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;
  const [jobStatusLabel, setJobStatusLabel] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (params: PipelineVideoRunRequest) => {
      if (!accessToken) throw new Error('Not signed in');
      const created = await thumbnailsApi.runThumbnailPipelineVideo(accessToken, params);
      setJobStatusLabel('Queued');
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        const job = await thumbnailsApi.getThumbnailPipelineJob(accessToken, created.job_id);
        if (job.status === 'queued') {
          setJobStatusLabel('Queued');
          continue;
        }
        if (job.status === 'running') {
          setJobStatusLabel('Processing');
          continue;
        }
        if (job.status === 'succeeded') {
          setJobStatusLabel('Done');
          if (!job.result) {
            throw new Error('Video pipeline job finished without result payload');
          }
          return toPipelineVideoResponse(job.result);
        }
        if (job.status === 'failed') {
          setJobStatusLabel('Failed');
          throw new Error(job.error?.message || 'Video pipeline job failed');
        }
      }
      throw new Error('Video pipeline polling timed out');
    },
    onError: (err) => {
      if (isApiError(err) && err.statusCode === 429) {
        toast.error('Too many video runs. Try again in a little while.');
        return;
      }
      if (handlePipelineVideoDurationError(err)) return;
      if (handleOpenRouterMutationError(err)) return;
      if (handleBillingMutationError(err)) return;
      toast.error(err instanceof Error ? err.message : 'Video pipeline failed');
    },
    onSettled: () => {
      setJobStatusLabel(null);
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId) });
      }
    },
  });

  return {
    ...mutation,
    jobStatusLabel,
  };
}
