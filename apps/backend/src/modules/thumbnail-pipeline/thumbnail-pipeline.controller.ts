import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_PIPELINE_RUN } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { ProjectVariantImageService } from '../project-thumbnail-generation/project-variant-image.service';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../storage/storage.service';
import { VideoIngestionService } from '../video-thumbnails/services/video-ingestion.service';
import { VideoPipelineDurationGateService } from '../video-thumbnails/services/video-pipeline-duration-gate.service';
import type { UploadedVideoFile } from '../video-thumbnails/types/upload.types';
import { ThumbnailPipelineRunDto } from './dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineRunVideoDto } from './dto/thumbnail-pipeline-run-video.dto';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';
import type { PipelineVideoContext } from '../video-thumbnails/types/video-pipeline-video-context';
import { PipelineProjectPersistenceService } from './services/pipeline-project-persistence.service';

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
    private readonly orchestrator: ThumbnailPipelineOrchestratorService,
    private readonly persistence: PipelineProjectPersistenceService,
    private readonly projectVariantImage: ProjectVariantImageService,
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
    return this.executePipeline(userId, body, videoContext);
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
    const resolvedRefs =
      body.template_id?.trim() || body.avatar_id?.trim()
        ? await this.projectVariantImage.resolveReferenceDataUrlsForUser({
            userId,
            templateId: body.template_id,
            avatarId: body.avatar_id,
            logContext: 'pipeline/run',
          })
        : undefined;
    const resolvedTemplateRefs =
      resolvedRefs?.hasTemplateImage && resolvedRefs.dataUrls[0]
        ? [resolvedRefs.dataUrls[0]]
        : [];
    const resolvedFaceRefs =
      resolvedRefs?.hasAvatarImage && resolvedRefs.dataUrls[resolvedRefs.dataUrls.length - 1]
        ? [resolvedRefs.dataUrls[resolvedRefs.dataUrls.length - 1]]
        : [];

    const runInput = {
      userId,
      userPrompt: body.user_prompt,
      style: body.style,
      videoUrl: body.video_url,
      templateReferenceDataUrls: [...resolvedTemplateRefs, ...(body.template_reference_data_urls ?? [])],
      faceReferenceDataUrls: [...resolvedFaceRefs, ...(body.face_reference_data_urls ?? [])],
      variantCount: body.variant_count,
      generateImages: Boolean(body.generate_images),
      prioritizeFace: Boolean(body.prioritize_face),
      baseImageDataUrl: body.base_image_data_url,
      editInstruction: body.edit_instruction,
    };
    const result = await this.orchestrator.run(runInput);
    const warnings: string[] = [];
    if (body.template_id?.trim() && resolvedRefs && !resolvedRefs.hasTemplateImage) {
      warnings.push(`Template reference not resolved: ${body.template_id.trim()}`);
    }
    if (body.avatar_id?.trim() && resolvedRefs && !resolvedRefs.hasAvatarImage) {
      warnings.push(`Avatar reference not resolved: ${body.avatar_id.trim()}`);
    }

    const persistedProject =
      body.persist_project && result.variants?.length
        ? await this.persistence.persist({
            userId,
            runInput,
            runResult: result,
            videoContext,
          })
        : undefined;

    return {
      run_id: result.runId,
      credits_charged: result.creditsCharged,
      analysis: result.analysis,
      image_prompts_used: result.imagePromptsUsed,
      models_used: result.modelsUsed,
      variants: result.variants?.map((v) => ({
        index: v.index,
        prompt: v.prompt,
        content_type: v.contentType,
        image_base64: v.buffer.toString('base64'),
      })),
      edited: result.edited
        ? {
            content_type: result.edited.contentType,
            image_base64: result.edited.buffer.toString('base64'),
          }
        : undefined,
      persisted_project: persistedProject
        ? {
            project_id: persistedProject.projectId,
            variants: persistedProject.variants.map((v) => ({
              index: v.index,
              prompt: v.prompt,
              storage_path: v.storagePath,
              signed_url: v.signedUrl,
            })),
          }
        : undefined,
      resolved_references: resolvedRefs
        ? {
            template_from_id: resolvedRefs.hasTemplateImage,
            face_from_id: resolvedRefs.hasAvatarImage,
          }
        : undefined,
      warnings: warnings.length ? warnings : undefined,
      video_context: videoContext,
    };
  }
}
