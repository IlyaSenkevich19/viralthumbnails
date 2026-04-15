import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThumbnailPipelineEnabledGuard } from './thumbnail-pipeline-feature';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_VIDEO_FROM } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { ProjectVariantImageService } from '../project-thumbnail-generation/project-variant-image.service';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../storage/storage.service';
import { VideoIngestionService } from '../video-thumbnails/services/video-ingestion.service';
import type { UploadedVideoFile } from '../video-thumbnails/types/upload.types';
import { ThumbnailPipelineRunDto } from './dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineRunVideoDto } from './dto/thumbnail-pipeline-run-video.dto';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';
import { PipelineProjectPersistenceService } from './services/pipeline-project-persistence.service';

const VIDEO_UPLOAD_LIMIT_BYTES = 80 * 1024 * 1024;

/**
 * Modular OpenRouter thumbnail pipeline (MVP). Disabled in production by default
 * unless `THUMBNAIL_PIPELINE_ENABLED=1`. Reserves generation credits up-front (`BillingService`).
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
  ) {}

  @Post('pipeline/run')
  @UseGuards(ThumbnailPipelineEnabledGuard, UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_VIDEO_FROM } })
  async runPipeline(@CurrentUser() userId: string, @Body() body: ThumbnailPipelineRunDto) {
    return this.executePipeline(userId, body);
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
  @UseGuards(ThumbnailPipelineEnabledGuard, UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_VIDEO_FROM } })
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
    try {
      return await this.executePipeline(userId, {
        user_prompt: body.prompt?.trim() || 'Generate engaging YouTube thumbnails from this video.',
        style: body.style,
        video_url: resolved.url,
        template_id: body.template_id,
        avatar_id: body.avatar_id,
        variant_count: body.count,
        generate_images: true,
        prioritize_face: Boolean(body.prioritize_face),
        persist_project: true,
      });
    } finally {
      if (resolved.tempStoragePath) {
        await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, [resolved.tempStoragePath]);
      }
    }
  }

  private async executePipeline(userId: string, body: ThumbnailPipelineRunDto) {
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

    const persistedProject =
      body.persist_project && result.variants?.length
        ? await this.persistence.persist({
            userId,
            runInput,
            runResult: result,
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
    };
  }
}
