import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BillingService } from '../../billing/billing.service';
import type { ThumbnailPipelineRunInput, ThumbnailPipelineRunResult } from '../types/thumbnail-pipeline-run.types';
import { PipelinePromptBuilderService } from './pipeline-prompt-builder.service';
import { PipelinePromptRefinementService } from './pipeline-prompt-refinement.service';
import { PipelineThumbnailEditingService } from './pipeline-thumbnail-editing.service';
import { PipelineThumbnailGenerationService } from './pipeline-thumbnail-generation.service';
import { PipelineVideoUnderstandingService } from './pipeline-video-understanding.service';

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
    private readonly promptBuilder: PipelinePromptBuilderService,
    private readonly thumbnailGen: PipelineThumbnailGenerationService,
    private readonly thumbnailEdit: PipelineThumbnailEditingService,
  ) {}

  async run(input: ThumbnailPipelineRunInput): Promise<ThumbnailPipelineRunResult> {
    const runId = randomUUID();
    const count = Math.min(12, Math.max(1, input.variantCount ?? 4));
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
      const refined = await this.refinement.refineIfConfigured(input.userPrompt);

      const { analysis, modelUsed } = await this.videoUnderstanding.analyze({
        userPrompt: refined.text,
        style: input.style,
        videoUrl: input.videoUrl,
        templateReferenceDataUrls: input.templateReferenceDataUrls,
        faceReferenceDataUrls: input.faceReferenceDataUrls,
      });

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
        modelsUsed.imageGeneration = this.thumbnailGen.imageModel();
        variants = await this.thumbnailGen.generateVariants({
          prompts: imagePromptsUsed,
          reference: refBundle,
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

      return {
        runId,
        creditsCharged: creditCost,
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
