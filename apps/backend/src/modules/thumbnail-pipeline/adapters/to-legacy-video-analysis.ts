import type { VideoAnalysis } from '../../video-thumbnails/schemas/video-analysis.schema';
import type { ThumbnailPipelineAnalysis } from '../schemas/thumbnail-pipeline-analysis.schema';

/**
 * Bridges the richer pipeline analysis into the legacy `from-video` shape
 * so existing ranking / persistence code can adopt the pipeline incrementally.
 */
export function pipelineAnalysisToLegacyVideoAnalysis(a: ThumbnailPipelineAnalysis): VideoAnalysis {
  const end = a.bestThumbnailMoment.endSec ?? a.bestThumbnailMoment.startSec;
  return {
    summary: `${a.mainSubject} — ${a.sceneSummary}`.slice(0, 4000),
    bestScenes: [
      {
        startSec: a.bestThumbnailMoment.startSec,
        endSec: Math.max(end, a.bestThumbnailMoment.startSec),
        label: a.bestThumbnailMoment.label,
        why: a.bestThumbnailMoment.why,
        thumbnailAngle: a.compositionSuggestions[0],
      },
    ],
    timestamps: [a.bestThumbnailMoment.startSec],
    thumbnailAngles: a.compositionSuggestions,
    promptSeeds: a.imageGenerationPromptSuggestions,
    negativeConstraints: a.negativeCues,
  };
}
