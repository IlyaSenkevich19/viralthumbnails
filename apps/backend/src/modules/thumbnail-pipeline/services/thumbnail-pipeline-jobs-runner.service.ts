import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import { ThumbnailPipelineRunDto } from '../dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineExecutionService } from './thumbnail-pipeline-execution.service';
import { ThumbnailPipelineJobsService } from './thumbnail-pipeline-jobs.service';
import type { ThumbnailPipelineJobRow } from '../types/thumbnail-pipeline-job.types';

const JOB_POLL_INTERVAL_MS = 1500;
const JOB_LEASE_MS = 2 * 60 * 1000;

@Injectable()
export class ThumbnailPipelineJobsRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ThumbnailPipelineJobsRunnerService.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly jobs: ThumbnailPipelineJobsService,
    private readonly execution: ThumbnailPipelineExecutionService,
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
    try {
      const payload = (job.request_payload ?? {}) as {
        body?: ThumbnailPipelineRunDto;
        videoContext?: PipelineVideoContext;
      };
      const body = payload.body;
      if (!body?.user_prompt) {
        throw new Error('Invalid job payload: missing body.user_prompt');
      }
      const result = await this.execution.execute(job.user_id, body, payload.videoContext);
      await this.jobs.markSucceeded(job.id, result);
      const elapsed = Date.now() - startedAt;
      this.logger.log(`Pipeline job succeeded id=${job.id} elapsedMs=${elapsed}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.jobs.markFailed(job.id, { message: msg });
      const elapsed = Date.now() - startedAt;
      this.logger.warn(`Pipeline job failed id=${job.id} elapsedMs=${elapsed} reason=${msg}`);
    }
  }
}

