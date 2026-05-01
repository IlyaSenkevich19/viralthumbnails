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
  viewerCuriosity: z.string().optional(),
  primaryHookText: z.string().optional(),
  hookRationale: z.string().optional(),
  textPlacement: z.string().optional(),
  subjectPlacement: z.string().optional(),
  layoutRationale: z.string().optional(),
  doNotCoverRegions: z.array(z.string()).max(12).optional(),
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
  "viewerCuriosity": string,
  "primaryHookText": string,
  "hookRationale": string,
  "textPlacement": string,
  "subjectPlacement": string,
  "layoutRationale": string,
  "doNotCoverRegions": string[],
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
- viewerCuriosity: the open loop viewers should feel, grounded in the video promise.
- primaryHookText: the best short on-image hook. Match the source language when obvious (for Russian videos/prompts, write Russian text). Keep it 1-4 words, not a copied full title.
- hookRationale: why this exact hook matches the source and would make the target viewer click. Do not invent fights, versus claims, romantic drama, money claims, or shocking events unless the frames, transcript, metadata, or creator prompt clearly support them.
- textPlacement: where text should sit in the 16:9 frame without covering the face, eyes, mouth, hands, or main object.
- subjectPlacement: where the main subject should sit after crop/recompose.
- layoutRationale: one sentence explaining the thumbnail composition strategy.
- doNotCoverRegions: concrete regions/elements text must not cover (e.g. "face", "eyes", "mouth", "main object", "lower-right timestamp area").
- thumbnailMoments: 3-5 ranked clickable moments/frames with why it would make someone click; each thumbnailText must fit the moment and source language.
- thumbnailTextIdeas: 3-8 short on-image title phrases (1-4 words, bold, scannable; do not repeat a long video title; match source language when obvious).
- visualHooks: 3-10 punchy phrases (contrast, props, motion, gaze, text placement).
- compositionSuggestions: 3-10 concrete layout / safe-area / hierarchy tips for 16:9 YouTube thumbnails.
- negativeCues: things to avoid (clutter, tiny text, misleading clickbait, etc.).
- imageGenerationPromptSuggestions: 3-12 English prompts ready for an image model (16:9, bold readable title, high contrast, text placed away from face/main object).`;
