import { Body, Controller, Get, NotFoundException, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_PIPELINE_RUN } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../storage/storage.service';
import { VideoIngestionService } from '../video-thumbnails/services/video-ingestion.service';
import { VideoPipelineDurationGateService } from '../video-thumbnails/services/video-pipeline-duration-gate.service';
import type { UploadedVideoFile } from '../video-thumbnails/types/upload.types';
import { ThumbnailPipelineRunDto } from './dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineRunVideoDto } from './dto/thumbnail-pipeline-run-video.dto';
import type { PipelineVideoContext } from '../video-thumbnails/types/video-pipeline-video-context';
import { ThumbnailPipelineExecutionService } from './services/thumbnail-pipeline-execution.service';
import { ThumbnailPipelineJobsService } from './services/thumbnail-pipeline-jobs.service';

const VIDEO_UPLOAD_LIMIT_BYTES = 80 * 1024 * 1024;

/**
 * Modular OpenRouter thumbnail pipeline (MVP). Reserves generation credits up-front (`BillingService`).
 */
@ApiTags('thumbnails')
@ApiBearerAuth()
@Controller(ApiControllerPaths.thumbnails)
@UseGuards(SupabaseGuard)
export class ThumbnailPipelineController {
  constructor(
    private readonly execution: ThumbnailPipelineExecutionService,
    private readonly jobs: ThumbnailPipelineJobsService,
    private readonly ingestion: VideoIngestionService,
    private readonly storage: StorageService,
    private readonly videoDurationGate: VideoPipelineDurationGateService,
  ) {}

  @Post('pipeline/run')
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_PIPELINE_RUN } })
  async runPipeline(@CurrentUser() userId: string, @Body() body: ThumbnailPipelineRunDto) {
    const videoContext = await this.videoDurationGate.resolveContextAndEnforceForPipeline({
      videoUrl: body.video_url?.trim(),
      logContext: 'pipeline/run',
    });
    const job = await this.jobs.enqueue({
      userId,
      payload: { body, videoContext },
    });
    return {
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
    };
  }

  @Get('pipeline/jobs/:jobId')
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_PIPELINE_RUN } })
  async getPipelineJob(@CurrentUser() userId: string, @Param('jobId') jobId: string) {
    const job = await this.jobs.getForUser(jobId, userId);
    if (!job) {
      throw new NotFoundException({
        code: 'PIPELINE_JOB_NOT_FOUND',
        message: 'Pipeline job was not found.',
      });
    }
    return {
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      result: job.result_payload ?? undefined,
      error: job.error_payload ?? undefined,
    };
  }

  @Post('pipeline/run-video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        videoUrl: { type: 'string' },
        count: { type: 'integer', minimum: 1, maximum: 12 },
        style: { type: 'string' },
        prompt: { type: 'string', description: 'Creative direction for pipeline analysis and prompts' },
        template_id: { type: 'string' },
        avatar_id: { type: 'string', format: 'uuid' },
        prioritize_face: { type: 'boolean' },
      },
    },
  })
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_PIPELINE_RUN } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: VIDEO_UPLOAD_LIMIT_BYTES },
    }),
  )
  async runPipelineVideo(
    @CurrentUser() userId: string,
    @Body() body: ThumbnailPipelineRunVideoDto,
    @UploadedFile() file?: UploadedVideoFile,
  ) {
    const ingestRunId = randomUUID();
    const resolved = await this.ingestion.resolve({
      userId,
      runId: ingestRunId,
      videoUrl: body.videoUrl,
      file,
    });
    const videoContext = await this.videoDurationGate.resolveContextAndEnforceForPipeline({
      videoUrl: body.videoUrl?.trim(),
      upload: file?.buffer?.length ? file : undefined,
      logContext: 'pipeline/run-video',
    });
    try {
      return await this.executePipeline(
        userId,
        {
        user_prompt: body.prompt?.trim() || 'Generate engaging YouTube thumbnails from this video.',
        style: body.style,
        video_url: resolved.url,
        template_id: body.template_id,
        avatar_id: body.avatar_id,
        variant_count: body.count,
        generate_images: true,
        prioritize_face: Boolean(body.prioritize_face),
        persist_project: true,
        },
        videoContext,
      );
    } finally {
      if (resolved.tempStoragePath) {
        await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, [resolved.tempStoragePath]);
      }
    }
  }

  private async executePipeline(
    userId: string,
    body: ThumbnailPipelineRunDto,
    videoContext?: PipelineVideoContext,
  ) {
    return this.execution.execute(userId, body, videoContext);
  }
}
