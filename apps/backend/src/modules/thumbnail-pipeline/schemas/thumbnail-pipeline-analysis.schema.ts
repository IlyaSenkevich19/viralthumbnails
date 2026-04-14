import { z } from 'zod';

/** Single best-moment pick for thumbnail framing (may align with a key frame). */
export const BestThumbnailMomentSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative().optional(),
  label: z.string().min(1),
  why: z.string(),
});

export type BestThumbnailMoment = z.infer<typeof BestThumbnailMomentSchema>;

export const ThumbnailPipelineAnalysisSchema = z.object({
  mainSubject: z.string().min(1),
  sceneSummary: z.string().min(1),
  visualHooks: z.array(z.string()).min(1).max(16),
  emotion: z.string().min(1),
  bestThumbnailMoment: BestThumbnailMomentSchema,
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
  "compositionSuggestions": string[],
  "thumbnailTextIdeas": string[],
  "negativeCues": string[],
  "imageGenerationPromptSuggestions": string[]
}
Rules:
- Ground every field in what is visible or clearly implied. If no video was provided, infer cautiously from the text prompt and any reference images.
- visualHooks: 3-10 punchy phrases (contrast, props, motion, gaze, text placement).
- compositionSuggestions: 3-10 concrete layout / safe-area / hierarchy tips for 16:9 YouTube thumbnails.
- thumbnailTextIdeas: 3-8 short on-image title phrases (bold, scannable).
- negativeCues: things to avoid (clutter, tiny text, misleading clickbait, etc.).
- imageGenerationPromptSuggestions: 3-12 English prompts ready for an image model (16:9, bold readable title, high contrast).`;
