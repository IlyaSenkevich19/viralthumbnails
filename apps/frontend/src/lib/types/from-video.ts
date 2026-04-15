/** UI response shape for video-mode create flow (`POST /api/thumbnails/pipeline/run-video`). */

export type FromVideoThumbnailRow = {
  rank: number;
  storagePath: string;
  signedUrl: string;
  prompt: string;
  seedIndex: number;
  scores: Record<string, unknown>;
};

export type FromVideoResponse = {
  runId: string;
  projectId: string;
  analysis: unknown;
  selectedShots: unknown;
  thumbnails: FromVideoThumbnailRow[];
};
