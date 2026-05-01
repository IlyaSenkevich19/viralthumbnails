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

export type ThumbnailPipelineStageTiming = {
  stage: ThumbnailPipelineJobStage;
  label: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
};

export type ThumbnailPipelineJobProgress = {
  stage: ThumbnailPipelineJobStage;
  label: string;
  current?: number;
  total?: number;
  percent?: number;
  stage_started_at?: string;
  elapsed_ms?: number;
  timings?: ThumbnailPipelineStageTiming[];
  analysis?: {
    main_subject?: string;
    scene_summary?: string;
    selected_frame_index?: number;
    selected_frame_time_sec?: number;
    selected_frame_why?: string;
    visual_frame_description?: string;
    viewer_curiosity?: string;
    hook_rationale?: string;
    text_placement?: string;
    subject_placement?: string;
    layout_rationale?: string;
    thumbnail_text_ideas?: string[];
    frame_extraction_mode?: 'direct_url' | 'yt_dlp_stream' | 'text_context_no_video_url';
    sampled_frames?: Array<{
      frame_index: number;
      time_sec: number;
      selected?: boolean;
      source?: 'direct_url' | 'yt_dlp_stream';
    }>;
    selected_frame_preview_data_url?: string;
  };
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

