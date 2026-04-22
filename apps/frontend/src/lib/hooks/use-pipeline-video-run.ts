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
import { THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY } from '@/lib/hooks/pipeline-mutation-keys';
import {
  handleBillingMutationError,
  handleOpenRouterMutationError,
  handlePipelineVideoDurationError,
} from '@/lib/paywall-notify';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 200;
const MAX_POLL_BACKOFF_MS = 10_000;

type PipelineVideoRecoveryOptions = {
  /** When set, job id is persisted for app-shell recovery after reload. */
  recoveryKey?: string;
};

function writeStoredJobId(key: string | undefined, jobId: string): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, jobId);
  } catch {
    // Ignore storage failures; polling still works in-memory.
  }
}

function clearStoredJobId(key?: string): void {
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function usePipelineVideoRunMutation(options?: PipelineVideoRecoveryOptions) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;
  const [jobStatusLabel, setJobStatusLabel] = useState<string | null>(null);

  const mutation = useMutation({
    mutationKey: THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY,
    mutationFn: async (params: PipelineVideoRunRequest) => {
      if (!accessToken) throw new Error('Not signed in');
      const created = await thumbnailsApi.runThumbnailPipelineVideo(accessToken, params);
      writeStoredJobId(options?.recoveryKey, created.job_id);
      setJobStatusLabel('Queued');
      let pollIntervalMs = POLL_INTERVAL_MS;
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        let job;
        try {
          job = await thumbnailsApi.getThumbnailPipelineJob(accessToken, created.job_id);
        } catch (err) {
          if (isApiError(err) && err.statusCode === 429) {
            pollIntervalMs = Math.min(MAX_POLL_BACKOFF_MS, pollIntervalMs * 2);
            setJobStatusLabel('Processing');
            continue;
          }
          throw err;
        }
        pollIntervalMs = POLL_INTERVAL_MS;
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
          clearStoredJobId(options?.recoveryKey);
          return toPipelineVideoResponse(job.result);
        }
        if (job.status === 'failed') {
          setJobStatusLabel('Failed');
          clearStoredJobId(options?.recoveryKey);
          throw new Error(job.error?.message || 'Video pipeline job failed');
        }
      }
      clearStoredJobId(options?.recoveryKey);
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
