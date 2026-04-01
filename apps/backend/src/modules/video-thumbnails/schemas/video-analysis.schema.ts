import { z } from 'zod';

export const BestSceneSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  label: z.string().min(1),
  why: z.string(),
  thumbnailAngle: z.string().optional(),
});

export type BestScene = z.infer<typeof BestSceneSchema>;

export const VideoAnalysisSchema = z.object({
  summary: z.string(),
  bestScenes: z.array(BestSceneSchema).min(1).max(12),
  /** Key moments in seconds (may overlap bestScenes) */
  timestamps: z.array(z.number().nonnegative()).max(24),
  thumbnailAngles: z.array(z.string()).max(16),
  promptSeeds: z.array(z.string()).min(1).max(20),
  negativeConstraints: z.array(z.string()).max(20),
});

export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;

export const VideoAnalysisJsonPrompt = `Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "summary": string,
  "bestScenes": [{ "startSec": number, "endSec": number, "label": string, "why": string, "thumbnailAngle"?: string }],
  "timestamps": number[],
  "thumbnailAngles": string[],
  "promptSeeds": string[],
  "negativeConstraints": string[]
}
Rules:
- bestScenes: 1-8 items, ordered by suitability for a YouTube thumbnail.
- timestamps: 3-12 notable seconds in the video.
- promptSeeds: 3-12 short English prompts for image generation (bold text, high contrast, 16:9).
- negativeConstraints: things to avoid (small text, clutter, etc.).`;
