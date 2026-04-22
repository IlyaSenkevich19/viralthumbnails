import type { PipelineRunResponse } from '@/lib/api/thumbnails';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';

/**
 * UI adapter: normalize `pipeline/run-video` response into the existing
 * video-result card model used by dashboard/new-project components.
 */
export function toPipelineVideoResponse(res: PipelineRunResponse): PipelineVideoResponse {
  const persisted = res.persisted_project;
  if (!persisted?.project_id) {
    throw new Error('Pipeline run finished but project was not persisted');
  }
  const thumbnails: PipelineVideoResponse['thumbnails'] = persisted.variants.map((v, index) => ({
    rank: index + 1,
    storagePath: v.storage_path,
    signedUrl: v.signed_url,
    prompt: v.prompt,
    seedIndex: index,
    scores: {},
  }));
  const selectedShots = Array.isArray((res.analysis as Record<string, unknown>)?.bestScenes)
    ? ((res.analysis as Record<string, unknown>).bestScenes as unknown[])
    : [];
  return {
    runId: res.run_id,
    projectId: persisted.project_id,
    analysis: res.analysis,
    selectedShots,
    thumbnails,
    resolvedReferences: res.resolved_references
      ? {
          templateFromId: Boolean(res.resolved_references.template_from_id),
          faceFromId: Boolean(res.resolved_references.face_from_id),
        }
      : undefined,
    warnings: res.warnings,
  };
}
