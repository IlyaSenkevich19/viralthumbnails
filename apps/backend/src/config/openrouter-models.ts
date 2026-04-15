export const OPENROUTER_STACK: {
  baseUrl: string;
  appTitle: string;
  projectGenTimeoutMs: number;
} = {
  baseUrl: 'https://openrouter.ai/api/v1',
  appTitle: 'ViralThumblify',
  projectGenTimeoutMs: 120_000,
};

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
