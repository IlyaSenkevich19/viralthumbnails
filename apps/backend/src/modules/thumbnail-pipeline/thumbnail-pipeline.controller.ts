import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThumbnailPipelineEnabledGuard } from './thumbnail-pipeline-feature';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_VIDEO_FROM } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { ProjectVariantImageService } from '../project-thumbnail-generation/project-variant-image.service';
import { ThumbnailPipelineRunDto } from './dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';
import { PipelineProjectPersistenceService } from './services/pipeline-project-persistence.service';

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
  ) {}

  @Post('pipeline/run')
  @UseGuards(ThumbnailPipelineEnabledGuard, UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_VIDEO_FROM } })
  async runPipeline(@CurrentUser() userId: string, @Body() body: ThumbnailPipelineRunDto) {
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
