import { z } from 'zod';

export const ThumbnailScoreSchema = z.object({
  readability: z.number().min(0).max(10),
  contrast: z.number().min(0).max(10),
  focalPoint: z.number().min(0).max(10),
  thumbnailSuitability: z.number().min(0).max(10),
  total: z.number().min(0).max(40),
  notes: z.string().optional(),
});

export type ThumbnailScore = z.infer<typeof ThumbnailScoreSchema>;

export const RankingResponseSchema = z.object({
  scores: ThumbnailScoreSchema,
});
