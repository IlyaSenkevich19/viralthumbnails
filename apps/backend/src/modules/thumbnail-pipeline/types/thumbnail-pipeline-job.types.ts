import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import type { ThumbnailPipelineRunDto } from '../dto/thumbnail-pipeline-run.dto';

export type ThumbnailPipelineJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type ThumbnailPipelineJobStage =
  | 'queued'
  | 'resolving_references'
  | 'analyzing_source'
  | 'building_prompts'
  | 'generating_images'
  | 'persisting_project'
  | 'completed'
  | 'failed';

export type ThumbnailPipelineJobProgress = {
  stage: ThumbnailPipelineJobStage;
  label: string;
  current?: number;
  total?: number;
  percent?: number;
};

export type ThumbnailPipelineJobPayload = {
  source: 'run' | 'run-video';
  body: ThumbnailPipelineRunDto;
  videoContext?: PipelineVideoContext;
  cleanupTempStoragePath?: string;
  projectId?: string;
};

export type ThumbnailPipelineJobRow = {
  id: string;
  user_id: string;
  status: ThumbnailPipelineJobStatus;
  request_payload: ThumbnailPipelineJobPayload;
  progress_payload: ThumbnailPipelineJobProgress | null;
  result_payload: unknown | null;
  error_payload: { code?: string; message: string } | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  lease_expires_at: string | null;
};

