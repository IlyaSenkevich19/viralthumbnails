import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OpenRouterApiError } from '../../openrouter/openrouter-api.error';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../../storage/storage.service';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import { ThumbnailPipelineRunDto } from '../dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineExecutionService } from './thumbnail-pipeline-execution.service';
import { ThumbnailPipelineJobsService } from './thumbnail-pipeline-jobs.service';
import type { ThumbnailPipelineJobRow } from '../types/thumbnail-pipeline-job.types';

const JOB_POLL_INTERVAL_MS = 1500;
const JOB_LEASE_MS = 15 * 60 * 1000;
const MAX_RETRIES = 1;

@Injectable()
export class ThumbnailPipelineJobsRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThumbnailPipelineJobsRunnerService.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly jobs: ThumbnailPipelineJobsService,
    private readonly execution: ThumbnailPipelineExecutionService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, JOB_POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const expired = await this.jobs.failExpiredRunningJobs();
      if (expired > 0) {
        this.logger.warn(`Marked ${expired} pipeline jobs as failed due to lease expiration`);
      }

      const job = await this.jobs.claimNextQueuedJob(JOB_LEASE_MS);
      if (!job) return;
      await this.runJob(job);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Pipeline jobs runner tick failed: ${msg}`);
    } finally {
      this.processing = false;
    }
  }

  private async runJob(job: ThumbnailPipelineJobRow): Promise<void> {
    const startedAt = Date.now();
    const queuedForMs = Math.max(0, startedAt - new Date(job.created_at).getTime());
    const payload = (job.request_payload ?? {}) as {
      source?: 'run' | 'run-video';
      body?: ThumbnailPipelineRunDto;
      videoContext?: PipelineVideoContext;
      cleanupTempStoragePath?: string;
      projectId?: string;
    };
    try {
      const body = payload.body;
      if (!body?.user_prompt) {
        throw new Error('Invalid job payload: missing body.user_prompt');
      }
      await this.jobs.updateProgress(job.id, {
        stage: 'resolving_references',
        label: 'Preparing video and inputs',
      });
      if (payload.projectId) {
        await this.jobs.updateProjectPipelineState({
          userId: job.user_id,
          projectId: payload.projectId,
          status: 'generating',
          pipelineJobId: job.id,
          progress: { stage: 'resolving_references', label: 'Preparing video and inputs' },
          errorMessage: null,
        });
      }
      const result = await this.execution.execute(
        job.user_id,
        body,
        payload.videoContext,
        async (progress) => {
          const timedProgress = await this.jobs.updateProgress(job.id, progress);
          if (payload.projectId) {
            await this.jobs.updateProjectPipelineState({
              userId: job.user_id,
              projectId: payload.projectId,
              status: 'generating',
              pipelineJobId: job.id,
              progress: timedProgress,
              errorMessage: null,
            });
          }
        },
      );
      await this.jobs.markSucceeded(job.id, result);
      if (payload.projectId) {
        await this.jobs.updateProjectPipelineState({
          userId: job.user_id,
          projectId: payload.projectId,
          status: 'done',
          pipelineJobId: job.id,
          progress: { stage: 'completed', label: 'Completed', percent: 100 },
          errorMessage: null,
        });
      }
      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `Pipeline job succeeded id=${job.id} source=${payload.source ?? 'run'} attempts=${job.attempt_count} queuedMs=${queuedForMs} execMs=${elapsed}`,
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const retryable = this.isRetryableError(err);
      const canRetry = retryable && job.attempt_count <= MAX_RETRIES;
      if (canRetry) {
        await this.jobs.requeue(job.id, {
          code: 'RETRYABLE_ERROR',
          message: err.message,
        });
        this.logger.warn(
          `Pipeline job retry scheduled id=${job.id} attempt=${job.attempt_count} reason=${this.retryReason(err)}`,
        );
      } else {
        await this.jobs.markFailed(job.id, { message: err.message });
        if (payload.projectId) {
          await this.jobs.updateProjectPipelineState({
            userId: job.user_id,
            projectId: payload.projectId,
            status: 'failed',
            pipelineJobId: job.id,
            progress: { stage: 'failed', label: err.message },
            errorMessage: err.message,
          });
        }
        const elapsed = Date.now() - startedAt;
        this.logger.warn(
          `Pipeline job failed id=${job.id} attempts=${job.attempt_count} queuedMs=${queuedForMs} execMs=${elapsed} retryable=${retryable} reason=${err.message}`,
        );
      }
    } finally {
      const payload = (job.request_payload ?? {}) as { cleanupTempStoragePath?: string };
      if (payload.cleanupTempStoragePath) {
        await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, [payload.cleanupTempStoragePath]);
      }
    }
  }

  private isRetryableError(err: Error): boolean {
    if (err instanceof OpenRouterApiError) {
      if (err.statusCode === 429) return true;
      if (err.statusCode >= 500) return true;
      return false;
    }
    const msg = err.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up')
    );
  }

  private retryReason(err: Error): string {
    if (err instanceof OpenRouterApiError) return `openrouter_${err.statusCode}`;
    return 'transient_network_or_timeout';
  }

}

