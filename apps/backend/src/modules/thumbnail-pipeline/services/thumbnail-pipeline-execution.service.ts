import { Injectable } from '@nestjs/common';
import { ProjectVariantImageService } from '../../project-thumbnail-generation/project-variant-image.service';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import { ThumbnailPipelineRunDto } from '../dto/thumbnail-pipeline-run.dto';
import { ThumbnailPipelineOrchestratorService } from './thumbnail-pipeline-orchestrator.service';
import { PipelineProjectPersistenceService } from './pipeline-project-persistence.service';
import type { ThumbnailPipelineJobProgress } from '../types/thumbnail-pipeline-job.types';

@Injectable()
export class ThumbnailPipelineExecutionService {
  constructor(
    private readonly orchestrator: ThumbnailPipelineOrchestratorService,
    private readonly persistence: PipelineProjectPersistenceService,
    private readonly projectVariantImage: ProjectVariantImageService,
  ) {}

  async execute(
    userId: string,
    body: ThumbnailPipelineRunDto,
    videoContext?: PipelineVideoContext,
    onProgress?: (progress: ThumbnailPipelineJobProgress) => Promise<void>,
  ): Promise<Record<string, unknown>> {
    await onProgress?.({ stage: 'resolving_references', label: 'Resolving template and face references' });
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
      projectId: body.project_id,
      userPrompt: body.user_prompt,
      style: body.style,
      videoUrl: body.video_url,
      videoContext,
      templateReferenceDataUrls: [...resolvedTemplateRefs, ...(body.template_reference_data_urls ?? [])],
      faceReferenceDataUrls: [...resolvedFaceRefs, ...(body.face_reference_data_urls ?? [])],
      variantCount: body.variant_count,
      generateImages: Boolean(body.generate_images),
      prioritizeFace: Boolean(body.prioritize_face),
      baseImageDataUrl: body.base_image_data_url,
      editInstruction: body.edit_instruction,
    };
    const result = await this.orchestrator.run(runInput, onProgress);
    const warnings: string[] = [];
    if (body.template_id?.trim() && resolvedRefs && !resolvedRefs.hasTemplateImage) {
      warnings.push(`Template reference not resolved: ${body.template_id.trim()}`);
    }
    if (body.avatar_id?.trim() && resolvedRefs && !resolvedRefs.hasAvatarImage) {
      warnings.push(`Avatar reference not resolved: ${body.avatar_id.trim()}`);
    }

    const persistedProject =
      body.persist_project && result.variants?.length
        ? await (async () => {
            await onProgress?.({ stage: 'persisting_project', label: 'Saving project and variants' });
            return this.persistence.persist({
            userId,
            runInput,
            runResult: result,
            videoContext,
            });
          })()
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

