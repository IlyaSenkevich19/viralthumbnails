import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BillingService } from '../../billing/billing.service';
import type { ThumbnailPipelineRunInput, ThumbnailPipelineRunResult } from '../types/thumbnail-pipeline-run.types';
import { PipelinePromptBuilderService } from './pipeline-prompt-builder.service';
import { PipelinePromptRefinementService } from './pipeline-prompt-refinement.service';
import { PipelineThumbnailEditingService } from './pipeline-thumbnail-editing.service';
import { PipelineThumbnailGenerationService } from './pipeline-thumbnail-generation.service';
import { PipelineVideoUnderstandingService } from './pipeline-video-understanding.service';
import { YoutubeTranscriptService } from '../../video-thumbnails/services/youtube-transcript.service';
import type { ThumbnailPipelineJobProgress } from '../types/thumbnail-pipeline-job.types';

const DEFAULT_PIPELINE_VARIANT_COUNT = 3;

/**
 * Coordinates ingest-shaped inputs → understanding → prompt building →
 * optional generation and optional editing. Credits are reserved up-front
 * and refunded on any failure.
 */
@Injectable()
export class ThumbnailPipelineOrchestratorService {
  constructor(
    private readonly billing: BillingService,
    private readonly refinement: PipelinePromptRefinementService,
    private readonly videoUnderstanding: PipelineVideoUnderstandingService,
    private readonly youtubeTranscript: YoutubeTranscriptService,
    private readonly promptBuilder: PipelinePromptBuilderService,
    private readonly thumbnailGen: PipelineThumbnailGenerationService,
    private readonly thumbnailEdit: PipelineThumbnailEditingService,
  ) {}

  async run(
    input: ThumbnailPipelineRunInput,
    onProgress?: (progress: ThumbnailPipelineJobProgress) => Promise<void>,
  ): Promise<ThumbnailPipelineRunResult> {
    const runId = randomUUID();
    const count = Math.min(12, Math.max(1, input.variantCount ?? DEFAULT_PIPELINE_VARIANT_COUNT));
    const includeImageEdit = Boolean(input.baseImageDataUrl?.trim() && input.editInstruction?.trim());
    const generateImages = Boolean(input.generateImages);

    const creditCost = this.billing.thumbnailPipelineCreditCost({
      variantCount: count,
      generateImages,
      includeImageEdit,
    });

    await this.billing.reserveGenerationCredits(input.userId, creditCost, {
      referenceType: 'thumbnail_pipeline_run',
      referenceId: runId,
    });

    try {
      await onProgress?.({ stage: 'analyzing_source', label: 'Analyzing source context' });
      const refined = await this.refinement.refineIfConfigured(input.userPrompt);
      const transcriptSnippet = input.videoUrl?.trim()
        ? await this.youtubeTranscript.tryFetchCompactTranscript(input.videoUrl.trim(), 'pipeline-vl')
        : null;

      const { analysis, modelUsed } = await this.videoUnderstanding.analyze({
        userPrompt: refined.text,
        style: input.style,
        videoUrl: input.videoUrl,
        videoContext: input.videoContext,
        transcriptSnippet: transcriptSnippet ?? undefined,
        templateReferenceDataUrls: input.templateReferenceDataUrls,
        faceReferenceDataUrls: input.faceReferenceDataUrls,
      });

      await onProgress?.({ stage: 'building_prompts', label: 'Building generation prompts' });
      const basePrompts = this.promptBuilder.buildFinalImagePrompts({
        analysis,
        userPrompt: refined.text,
        style: input.style,
        count,
      });

      const templateUrls = input.templateReferenceDataUrls ?? [];
      const faceUrls = input.faceReferenceDataUrls ?? [];
      const refBundle =
        templateUrls.length || faceUrls.length
          ? {
              dataUrls: [...templateUrls, ...faceUrls],
              hasTemplateImage: templateUrls.length > 0,
              hasFaceImage: faceUrls.length > 0,
              prioritizeFace: Boolean(input.prioritizeFace) && faceUrls.length > 0,
            }
          : undefined;

      const refLine = this.promptBuilder.referenceInstructionLine(refBundle);
      const imagePromptsUsed = refLine
        ? basePrompts.map((p) => `${p} ${refLine}`.slice(0, 2800))
        : basePrompts;

      const modelsUsed: ThumbnailPipelineRunResult['modelsUsed'] = {
        videoUnderstanding: modelUsed,
        textRefinement: refined.model,
      };

      let variants: ThumbnailPipelineRunResult['variants'];
      if (generateImages) {
        await onProgress?.({
          stage: 'generating_images',
          label: `Generating images (0/${imagePromptsUsed.length})`,
          current: 0,
          total: imagePromptsUsed.length,
          percent: 0,
        });
        const imageTier = input.imageModelTier ?? 'default';
        modelsUsed.imageGeneration = this.thumbnailGen.imageModel(imageTier);
        variants = await this.thumbnailGen.generateVariants({
          prompts: imagePromptsUsed,
          reference: refBundle,
          imageModelTier: imageTier,
          onProgress: onProgress
            ? async (progress) => {
                await onProgress({
                  stage: 'generating_images',
                  label: `Generating images (${progress.current}/${progress.total})`,
                  current: progress.current,
                  total: progress.total,
                  percent: progress.percent,
                });
              }
            : undefined,
        });
        if (!variants.length) {
          throw new BadGatewayException({
            code: 'PIPELINE_NO_IMAGES_GENERATED',
            message:
              'Image generation returned no images for this request. Try another prompt/style, reduce variant_count, or switch to a different image model.',
          });
        }
      }

      let edited: ThumbnailPipelineRunResult['edited'];
      if (input.baseImageDataUrl?.trim() && input.editInstruction?.trim()) {
        modelsUsed.imageEdit = this.thumbnailEdit.editModel();
        edited = await this.thumbnailEdit.editThumbnail({
          baseImageDataUrl: input.baseImageDataUrl.trim(),
          instruction: input.editInstruction.trim(),
          templateReferenceDataUrls: templateUrls,
          faceReferenceDataUrls: faceUrls,
        });
      }

      const generatedCount = variants?.length ?? 0;
      const actuallyCharged = 1 + (generateImages ? generatedCount : 0) + (edited ? 1 : 0);
      const refund = Math.max(0, creditCost - actuallyCharged);
      if (refund > 0) {
        try {
          await this.billing.refundGenerationCredits(input.userId, refund, {
            referenceType: 'thumbnail_pipeline_run',
            referenceId: runId,
          });
        } catch {
          /* best-effort; BillingService logs */
        }
      }

      return {
        runId,
        creditsCharged: actuallyCharged,
        analysis,
        imagePromptsUsed,
        variants,
        edited,
        modelsUsed,
      };
    } catch (e) {
      try {
        await this.billing.refundGenerationCredits(input.userId, creditCost, {
          referenceType: 'thumbnail_pipeline_run',
          referenceId: runId,
        });
      } catch {
        /* best-effort; BillingService logs */
      }
      throw e;
    }
  }
}
