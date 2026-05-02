import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';

/**
 * Must match `creditsForThumbnailPipelineRun` in backend billing service.
 * Default create flow uses analysis + image generation (no edit step).
 */
export function creditsForThumbnailPipelineRun(params: {
  variantCount: number;
  generateImages?: boolean;
  includeImageEdit?: boolean;
}): number {
  const n = Math.min(12, Math.max(1, Math.floor(params.variantCount)));
  return 1 + (params.generateImages ? n : 0) + (params.includeImageEdit ? 1 : 0);
}

/** One reserved credit per variant generated in a batch. */
export function creditsForProjectVariantBatch(count: number): number {
  return Math.max(0, Math.floor(count));
}

/** Smallest realistic pipeline debit (analysis / concepts without image outputs). */
export const MIN_PIPELINE_RUN_CREDIT_COST = creditsForThumbnailPipelineRun({
  variantCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
  generateImages: false,
});

/** Default Generate hub run (default variant count, images on, no pipeline image-edit surcharge). */
export const DEFAULT_FULL_PIPELINE_CREDIT_COST = creditsForThumbnailPipelineRun({
  variantCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
  generateImages: true,
});

/** Default full pipeline plus optional in-pipeline image edit (+1 credit). */
export const DEFAULT_PIPELINE_WITH_IMAGE_EDIT_COST = creditsForThumbnailPipelineRun({
  variantCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
  generateImages: true,
  includeImageEdit: true,
});
