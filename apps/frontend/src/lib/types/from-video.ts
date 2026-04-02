/** Response shape of `POST /api/thumbnails/from-video` (Nest `FromVideoThumbnailOutput`). */

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
  analysis: unknown;
  selectedShots: unknown;
  thumbnails: FromVideoThumbnailRow[];
};
