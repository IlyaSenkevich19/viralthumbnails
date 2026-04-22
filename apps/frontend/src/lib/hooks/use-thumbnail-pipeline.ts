'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { PipelineRunRequest } from '@/lib/api/thumbnails';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/api-error';
import { THUMBNAIL_PIPELINE_RUN_MUTATION_KEY } from '@/lib/hooks/pipeline-mutation-keys';
import {
  handleBillingMutationError,
  handleOpenRouterMutationError,
  handlePipelineVideoDurationError,
} from '@/lib/paywall-notify';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 200;
const MAX_POLL_BACKOFF_MS = 10_000;

type PipelineRecoveryOptions = {
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

export function useThumbnailPipelineMutation(options?: PipelineRecoveryOptions) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;
  const [jobStatusLabel, setJobStatusLabel] = useState<string | null>(null);

  const mutation = useMutation({
    mutationKey: THUMBNAIL_PIPELINE_RUN_MUTATION_KEY,
    mutationFn: async (params: PipelineRunRequest) => {
      if (!accessToken) throw new Error('Not signed in');
      const created = await thumbnailsApi.createThumbnailPipelineJob(accessToken, params);
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
            throw new Error('Pipeline job finished without result payload');
          }
          clearStoredJobId(options?.recoveryKey);
          return job.result;
        }
        if (job.status === 'failed') {
          setJobStatusLabel('Failed');
          clearStoredJobId(options?.recoveryKey);
          throw new Error(job.error?.message || 'Thumbnail pipeline job failed');
        }
      }
      clearStoredJobId(options?.recoveryKey);
      throw new Error('Thumbnail pipeline polling timed out');
    },
    onError: (err) => {
      if (isApiError(err) && err.statusCode === 429) {
        toast.error('Too many thumbnail runs. Try again in a little while.');
        return;
      }
      if (handlePipelineVideoDurationError(err)) return;
      if (handleOpenRouterMutationError(err)) return;
      if (handleBillingMutationError(err)) return;
      toast.error(err instanceof Error ? err.message : 'Thumbnail pipeline failed');
    },
    onSettled: () => {
      // Do not clear recoveryKey here: transient errors mid-poll must leave localStorage
      // so PipelineJobActivityProvider can resume after reload.
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
