/**
 * Все slug’и OpenRouter для бэкенда в одном месте (без env).
 *
 * - **`OPENROUTER_STACK`** — shared runtime settings (baseUrl/title/timeout/free-router flags).
 * - **`PIPELINE_STEP_MODELS`** — pipeline image/VL/edit step slugs.
 *
 * Каталог моделей: https://openrouter.ai/models
 */

/** Shared OpenRouter runtime settings (baseUrl/title/timeout/free-router flags). */
export const OPENROUTER_STACK: {
  baseUrl: string;
  appTitle: string;
  projectGenTimeoutMs: number;
  imageModel: string;
  videoModel: string;
  rankingModel?: string;
  useFreeTierForVideoAndRanking: boolean;
} = {
  baseUrl: 'https://openrouter.ai/api/v1',
  appTitle: 'ViralThumblify',
  projectGenTimeoutMs: 120_000,
  imageModel: 'google/gemini-2.5-flash-image-preview',
  videoModel: 'google/gemini-2.0-flash-001',
  useFreeTierForVideoAndRanking: false,
};

export const OPENROUTER_FREE_ROUTER = 'openrouter/free' as const;

/** Модульный JSON-пайплайн `POST /thumbnails/pipeline/run` (отдельные шаги VL / image / edit). */
export const PIPELINE_STEP_MODELS: {
  vlPrimary: string;
  vlFallback: string | undefined;
  textRefinement: string | undefined;
  imageGeneration: string;
  imageEdit: string;
} = {
  vlPrimary: 'google/gemma-4-26b-a4b-it:free',
  vlFallback: 'nvidia/nemotron-nano-12b-v2-vl:free',
  textRefinement: undefined,
  imageGeneration: 'black-forest-labs/flux.2-flex',
  imageEdit: 'black-forest-labs/flux.2-pro',
};
