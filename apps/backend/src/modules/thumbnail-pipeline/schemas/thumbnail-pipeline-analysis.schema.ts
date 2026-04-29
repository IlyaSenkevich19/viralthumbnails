import { z } from 'zod';

const NonNegativeNumberWithDefaultZero = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return 0;
  return v;
}, z.coerce.number().nonnegative());

/** Single best-moment pick for thumbnail framing (may align with a key frame). */
export const BestThumbnailMomentSchema = z.object({
  startSec: NonNegativeNumberWithDefaultZero,
  endSec: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  label: z.string().min(1),
  why: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : 'Model did not provide a reason.')),
});

export type BestThumbnailMoment = z.infer<typeof BestThumbnailMomentSchema>;

export const ThumbnailMomentCandidateSchema = z.object({
  frameIndex: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  startSec: NonNegativeNumberWithDefaultZero,
  label: z.string().min(1),
  why: z.string().min(1),
  visualHook: z.string().min(1),
  thumbnailText: z.string().min(1).max(80),
});

export type ThumbnailMomentCandidate = z.infer<typeof ThumbnailMomentCandidateSchema>;

export const ThumbnailPipelineAnalysisSchema = z.object({
  mainSubject: z.string().min(1),
  sceneSummary: z.string().min(1),
  visualHooks: z.array(z.string()).min(1).max(16),
  emotion: z.string().min(1),
  bestThumbnailMoment: BestThumbnailMomentSchema,
  thumbnailMoments: z.array(ThumbnailMomentCandidateSchema).min(1).max(5).optional(),
  selectedFrameIndex: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  selectedFrameWhy: z.string().optional(),
  visualFrameDescription: z.string().optional(),
  compositionSuggestions: z.array(z.string()).min(1).max(16),
  thumbnailTextIdeas: z.array(z.string()).min(1).max(12),
  negativeCues: z.array(z.string()).max(24),
  imageGenerationPromptSuggestions: z.array(z.string()).min(1).max(16),
});

export type ThumbnailPipelineAnalysis = z.infer<typeof ThumbnailPipelineAnalysisSchema>;

export const ThumbnailPipelineAnalysisJsonPrompt = `Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "mainSubject": string,
  "sceneSummary": string,
  "visualHooks": string[],
  "emotion": string,
  "bestThumbnailMoment": { "startSec": number, "endSec"?: number, "label": string, "why": string },
  "thumbnailMoments": [{ "frameIndex"?: number, "startSec": number, "label": string, "why": string, "visualHook": string, "thumbnailText": string }],
  "selectedFrameIndex"?: number,
  "selectedFrameWhy"?: string,
  "visualFrameDescription"?: string,
  "compositionSuggestions": string[],
  "thumbnailTextIdeas": string[],
  "negativeCues": string[],
  "imageGenerationPromptSuggestions": string[]
}
Rules:
- Ground every field in what is visible or clearly implied. If no video was provided, infer cautiously from the text prompt and any reference images.
- If sampled frames are provided, choose the strongest clickable frame and set selectedFrameIndex to its 1-based frame number.
- thumbnailMoments: 3-5 ranked clickable moments/frames with why it would make someone click.
- thumbnailTextIdeas: 3-8 short on-image title phrases (1-4 words, bold, scannable; do not repeat a long video title).
- visualHooks: 3-10 punchy phrases (contrast, props, motion, gaze, text placement).
- compositionSuggestions: 3-10 concrete layout / safe-area / hierarchy tips for 16:9 YouTube thumbnails.
- negativeCues: things to avoid (clutter, tiny text, misleading clickbait, etc.).
- imageGenerationPromptSuggestions: 3-12 English prompts ready for an image model (16:9, bold readable title, high contrast).`;
