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
  /** YouTube / `video_url` needs Gemini-class models; free Gemma often returns 400 on the same payload. */
  vlPrimary: 'google/gemini-2.5-flash',
  vlFallback: 'google/gemini-2.0-flash-001',
  textRefinement: undefined,
  imageGeneration: 'sourceful/riverflow-v2-fast',
  imageEdit: 'black-forest-labs/flux.2-pro',
};
