/**
 * OpenRouter model slugs for the modular thumbnail pipeline (MVP).
 * Deliberately **not** loaded from env — edit this object while the product stabilizes.
 *
 * Project-level `POST /projects/:id/generate` still uses `OPENROUTER_IMAGE_MODEL` only.
 */
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
