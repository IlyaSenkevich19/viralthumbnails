export const OPENROUTER_STACK: {
  baseUrl: string;
  appTitle: string;
  projectGenTimeoutMs: number;
} = {
  baseUrl: 'https://openrouter.ai/api/v1',
  appTitle: 'ViralThumblify',
  projectGenTimeoutMs: 120_000,
};

/** Tier for still-image generation (`POST /projects/:id/generate` + pipeline image step). */
export type ThumbnailImageModelTier = 'default' | 'premium';

/** OpenRouter slugs for 16:9 thumbnail stills (edit step uses Pro). Change here only, not via env. */
const FLUX2_PRO_SLUG = 'black-forest-labs/flux.2-pro';
const FLUX2_MAX_SLUG = 'black-forest-labs/flux.2-max';

/**
 * OpenRouter slug for 16:9 thumbnail stills.
 * - **default** → FLUX.2 Pro
 * - **premium** → FLUX.2 Max
 */
export function getOpenRouterThumbnailImageModel(tier: ThumbnailImageModelTier = 'default'): string {
  return tier === 'premium' ? FLUX2_MAX_SLUG : FLUX2_PRO_SLUG;
}

/** Модульный JSON-пайплайн `POST /thumbnails/pipeline/run` (отдельные шаги VL / image / edit). */
export const PIPELINE_STEP_MODELS: {
  vlPrimary: string;
  vlFallback: string | undefined;
  textRefinement: string | undefined;
  /** Same as {@link getOpenRouterThumbnailImageModel}(`default`). */
  imageGeneration: string;
  imageEdit: string;
} = {
  /** YouTube / `video_url` needs Gemini-class models; free Gemma often returns 400 on the same payload. */
  vlPrimary: 'google/gemini-2.5-flash',
  vlFallback: 'google/gemini-2.0-flash-001',
  textRefinement: undefined,
  imageGeneration: FLUX2_PRO_SLUG,
  imageEdit: FLUX2_PRO_SLUG,
};

/** Payload slice for `GET /health/setup` — один источник правды для UI «Pipeline models». */
export type PipelineSetupModelSnapshot = {
  vlPrimary: string;
  vlFallback: string | null;
  textRefinement: string | null;
  imageGenerationDefault: string;
  imageGenerationPremium: string;
  imageEdit: string;
};

export function getPipelineSetupModelSnapshot(): PipelineSetupModelSnapshot {
  return {
    vlPrimary: PIPELINE_STEP_MODELS.vlPrimary,
    vlFallback: PIPELINE_STEP_MODELS.vlFallback ?? null,
    textRefinement: PIPELINE_STEP_MODELS.textRefinement ?? null,
    imageGenerationDefault: getOpenRouterThumbnailImageModel('default'),
    imageGenerationPremium: getOpenRouterThumbnailImageModel('premium'),
    imageEdit: PIPELINE_STEP_MODELS.imageEdit,
  };
}
