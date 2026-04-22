'use client';

import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';
import { toPipelineVideoResponse } from '@/lib/adapters/pipeline-video-response';
import { isApiError } from '@/lib/api/api-error';
import {
  THUMBNAIL_PIPELINE_RUN_MUTATION_KEY,
  THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY,
} from '@/lib/hooks/pipeline-mutation-keys';
import { queryKeys } from '@/lib/query-keys';
import {
  DASHBOARD_PIPELINE_RUN_RECOVERY_KEY,
  DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY,
} from '@/lib/pipeline/pipeline-recovery-storage';
import {
  getPipelineJobPollWaitMs,
  PIPELINE_JOB_MAX_POLL_ATTEMPTS,
  PIPELINE_JOB_POLL_429_MAX_BACKOFF_MS,
} from '@/lib/pipeline/pipeline-job-poll';
import {
  handleRecoveredPipelineRunSuccess,
  handleRecoveredVideoRunSuccess,
} from '@/components/dashboard/dashboard-create-hub.handlers';

export type PipelineJobActivityValue = {
  /** Status text while a stored job is being polled in the app shell (e.g. after reload). */
  activityLabel: string | null;
  isRecovering: boolean;
};

const PipelineJobActivityContext = createContext<PipelineJobActivityValue | null>(null);

function readId(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key)?.trim() || null;
  } catch {
    return null;
  }
}

function clearId(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function usePipelineJobAppRecoveryValue(): PipelineJobActivityValue {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  const runMutationActive = useIsMutating({ mutationKey: [...THUMBNAIL_PIPELINE_RUN_MUTATION_KEY] }) > 0;
  const videoMutationActive = useIsMutating({ mutationKey: [...THUMBNAIL_PIPELINE_VIDEO_MUTATION_KEY] }) > 0;

  const [activityLabel, setActivityLabel] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!accessToken || !userId) {
      setActivityLabel(null);
      setIsRecovering(false);
      return;
    }

    const token = accessToken;
    let cancelled = false;

    const pollOne = async (params: {
      kind: 'run' | 'video';
      jobId: string;
      storageKey: string;
    }) => {
      let successfulPolls = 0;
      let nextWaitMs = 0;
      for (let i = 0; i < PIPELINE_JOB_MAX_POLL_ATTEMPTS; i++) {
        if (cancelled) return;
        if (nextWaitMs > 0) {
          await new Promise((r) => setTimeout(r, nextWaitMs));
        }
        let job;
        try {
          job = await thumbnailsApi.getThumbnailPipelineJob(token, params.jobId);
        } catch (e) {
          if (isApiError(e) && e.statusCode === 429) {
            const base = nextWaitMs > 0 ? nextWaitMs : getPipelineJobPollWaitMs(0);
            nextWaitMs = Math.min(PIPELINE_JOB_POLL_429_MAX_BACKOFF_MS, base * 2);
            setActivityLabel('Processing');
            continue;
          }
          throw e;
        }
        if (job.status === 'succeeded') {
          clearId(params.storageKey);
          if (!job.result) throw new Error('Pipeline job finished without result payload');
          if (params.kind === 'run') {
            handleRecoveredPipelineRunSuccess({ result: job.result, push: router.push });
          } else {
            handleRecoveredVideoRunSuccess({
              result: toPipelineVideoResponse(job.result),
              push: router.push,
            });
          }
          if (userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId) });
          }
          return;
        }
        if (job.status === 'failed') {
          clearId(params.storageKey);
          throw new Error(job.error?.message || 'Pipeline job failed');
        }
        setActivityLabel(job.status === 'queued' ? 'Queued' : 'Processing');
        successfulPolls += 1;
        nextWaitMs = getPipelineJobPollWaitMs(successfulPolls - 1);
      }
      clearId(params.storageKey);
      throw new Error('Pipeline job polling timed out');
    };

    const tryRecover = async () => {
      const runId = readId(DASHBOARD_PIPELINE_RUN_RECOVERY_KEY);
      const videoId = readId(DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY);
      if (!runId && !videoId) {
        if (!cancelled) {
          setActivityLabel(null);
          setIsRecovering(false);
        }
        return;
      }

      const canRecoverRun = Boolean(runId && !runMutationActive);
      const canRecoverVideo = Boolean(videoId && !videoMutationActive);
      if (!canRecoverRun && !canRecoverVideo) {
        if (!cancelled) {
          setActivityLabel(null);
          setIsRecovering(false);
        }
        return;
      }

      if (!cancelled) {
        setIsRecovering(true);
        setActivityLabel('Resuming');
      }

      try {
        if (canRecoverRun) {
          if (runId) await pollOne({ kind: 'run', jobId: runId, storageKey: DASHBOARD_PIPELINE_RUN_RECOVERY_KEY });
        }
        if (cancelled) return;
        const videoAfter = readId(DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY);
        if (videoAfter && !videoMutationActive) {
          await pollOne({ kind: 'video', jobId: videoAfter, storageKey: DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY });
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Pipeline job recovery failed');
        }
      } finally {
        if (!cancelled) {
          setIsRecovering(false);
          setActivityLabel(null);
          if (userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId) });
          }
        }
      }
    };

    void tryRecover();

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === DASHBOARD_PIPELINE_RUN_RECOVERY_KEY || ev.key === DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY) {
        void tryRecover();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, [accessToken, userId, runMutationActive, videoMutationActive, queryClient, router]);

  return { activityLabel, isRecovering };
}

export function PipelineJobActivityProvider({ children }: { children: ReactNode }) {
  const value = usePipelineJobAppRecoveryValue();
  return <PipelineJobActivityContext.Provider value={value}>{children}</PipelineJobActivityContext.Provider>;
}

export function usePipelineJobActivity(): PipelineJobActivityValue {
  const ctx = useContext(PipelineJobActivityContext);
  if (!ctx) {
    return { activityLabel: null, isRecovering: false };
  }
  return ctx;
}
