/**
 * Must match {@link creditsForVideoPipeline} in `apps/backend/.../billing.service.ts`.
 */
export function creditsForVideoPipeline(requestedThumbnailCount: number): number {
  const n = Math.min(12, Math.max(1, Math.floor(requestedThumbnailCount)));
  return 1 + 2 * n;
}

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
