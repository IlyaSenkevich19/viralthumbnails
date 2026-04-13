/**
 * Must match {@link creditsForVideoPipeline} in `apps/backend/.../billing.service.ts`.
 */
export function creditsForVideoPipeline(requestedThumbnailCount: number): number {
  const n = Math.min(12, Math.max(1, Math.floor(requestedThumbnailCount)));
  return 1 + 2 * n;
}

/** One reserved credit per variant generated in a batch. */
export function creditsForProjectVariantBatch(count: number): number {
  return Math.max(0, Math.floor(count));
}
