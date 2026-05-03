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
  getPipelineJobPollWaitMs,
  PIPELINE_JOB_MAX_POLL_ATTEMPTS,
  PIPELINE_JOB_POLL_429_MAX_BACKOFF_MS,
} from '@/lib/pipeline/pipeline-job-poll';
import {
  handleBillingMutationError,
  handleOpenRouterMutationError,
  handlePipelineVideoDurationError,
} from '@/lib/paywall-notify';
import { clearPipelineRecoveryJob, writePipelineRecoveryJob } from '@/lib/pipeline/pipeline-recovery-storage';

type PipelineRecoveryOptions = {
  /** When set, job id is persisted for app-shell recovery after reload. */
  recoveryKey?: string;
};

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
      writePipelineRecoveryJob(options?.recoveryKey, created.job_id);
      setJobStatusLabel('Queued');
      let attempt = 0;
      let nextWaitMs = getPipelineJobPollWaitMs(0);

      for (let i = 0; i < PIPELINE_JOB_MAX_POLL_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, nextWaitMs));
        let job;
        try {
          job = await thumbnailsApi.getThumbnailPipelineJob(accessToken, created.job_id);
        } catch (err) {
          if (isApiError(err) && err.statusCode === 429) {
            nextWaitMs = Math.min(PIPELINE_JOB_POLL_429_MAX_BACKOFF_MS, nextWaitMs * 2);
            setJobStatusLabel('Processing');
            continue;
          }
          throw err;
        }
        if (job.status === 'succeeded') {
          setJobStatusLabel('Done');
          if (!job.result) {
            throw new Error('Pipeline job finished without result payload');
          }
          clearPipelineRecoveryJob(options?.recoveryKey);
          if (job.result.warnings?.length) {
            toast.warning(job.result.warnings.join('\n'));
          }
          return job.result;
        }
        if (job.status === 'failed') {
          setJobStatusLabel('Failed');
          clearPipelineRecoveryJob(options?.recoveryKey);
          throw new Error(job.error?.message || 'Thumbnail pipeline job failed');
        }
        setJobStatusLabel(job.progress?.label || (job.status === 'queued' ? 'Queued' : 'Processing'));
        attempt += 1;
        nextWaitMs = getPipelineJobPollWaitMs(attempt);
      }
      clearPipelineRecoveryJob(options?.recoveryKey);
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
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.listsForUser(userId) });
      }
    },
  });

  return {
    ...mutation,
    jobStatusLabel,
  };
}
