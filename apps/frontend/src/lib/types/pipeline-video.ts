/** UI response shape for video-mode create flow (`POST /api/thumbnails/pipeline/run-video`). */

export type PipelineVideoThumbnailRow = {
  rank: number;
  storagePath: string;
  signedUrl: string;
  prompt: string;
  seedIndex: number;
  scores: Record<string, unknown>;
};

export type PipelineVideoResponse = {
  runId: string;
  projectId: string;
  analysis: unknown;
  selectedShots: unknown;
  thumbnails: PipelineVideoThumbnailRow[];
  resolvedReferences?: {
    templateFromId: boolean;
    faceFromId: boolean;
  };
  warnings?: string[];
};
