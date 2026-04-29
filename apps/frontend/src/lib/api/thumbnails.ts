import { ApiRoutes } from '@/config/api-routes';
import { fetchJson, fetchMultipart } from './fetch-json';

export type PipelineVideoRunRequest = {
  file?: File;
  videoUrl?: string;
  project_id?: string;
  count?: number;
  style?: string;
  prompt?: string;
  template_id?: string;
  avatar_id?: string;
  prioritize_face?: boolean;
  image_model_tier?: 'default' | 'premium';
};

/** @deprecated use `PipelineVideoRunRequest` */
export type FromVideoRequest = PipelineVideoRunRequest;

export type PipelineRunRequest = {
  user_prompt: string;
  project_id?: string;
  style?: string;
  video_url?: string;
  template_reference_data_urls?: string[];
  template_id?: string;
  face_reference_data_urls?: string[];
  avatar_id?: string;
  variant_count?: number;
  generate_images?: boolean;
  prioritize_face?: boolean;
  image_model_tier?: 'default' | 'premium';
  base_image_data_url?: string;
  edit_instruction?: string;
  persist_project?: boolean;
};

export type PipelineRunResponse = {
  run_id: string;
  credits_charged: number;
  analysis: Record<string, unknown>;
  video_analysis?: {
    sampledFrames?: Array<{ frameIndex: number; timeSec: number; selected?: boolean }>;
    selectedFramePreviewDataUrl?: string;
  };
  image_prompts_used: string[];
  models_used: {
    videoUnderstanding: string;
    textRefinement?: string;
    imageGeneration?: string;
    imageEdit?: string;
  };
  variants?: Array<{
    index: number;
    prompt: string;
    content_type: string;
    image_base64: string;
  }>;
  edited?: {
    content_type: string;
    image_base64: string;
  };
  persisted_project?: {
    project_id: string;
    variants: Array<{
      index: number;
      prompt: string;
      storage_path: string;
      signed_url: string;
    }>;
  };
  resolved_references?: {
    template_from_id: boolean;
    face_from_id: boolean;
  };
  warnings?: string[];
  /** Phase 1: server-measured duration / policy window when `video_url` or upload was used. */
  video_context?: PipelineVideoContext;
};

export type PipelineJobSubmitResponse = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
};

export type PipelineJobProgress = {
  stage:
    | 'queued'
    | 'resolving_references'
    | 'analyzing_source'
    | 'building_prompts'
    | 'generating_images'
    | 'persisting_project'
    | 'completed'
    | 'failed';
  label: string;
  current?: number;
  total?: number;
  percent?: number;
  stage_started_at?: string;
  elapsed_ms?: number;
  timings?: Array<{
    stage: PipelineJobProgress['stage'];
    label: string;
    started_at: string;
    finished_at?: string;
    duration_ms?: number;
  }>;
  analysis?: {
    main_subject?: string;
    scene_summary?: string;
    selected_frame_index?: number;
    selected_frame_time_sec?: number;
    selected_frame_why?: string;
    visual_frame_description?: string;
    thumbnail_text_ideas?: string[];
    sampled_frames?: Array<{ frame_index: number; time_sec: number; selected?: boolean }>;
    selected_frame_preview_data_url?: string;
  };
};

export type PipelineJobStatusResponse = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  progress?: PipelineJobProgress;
  result?: PipelineRunResponse;
  error?: { code?: string; message: string };
};

/** Mirrors backend `PipelineVideoContext` (snake_case JSON). */
export type PipelineVideoContext = {
  duration_seconds: number | null;
  duration_resolution: 'ffprobe_upload' | 'youtube_data_api' | 'unavailable';
  max_duration_seconds: number;
  analyzed_window: { start_sec: number; end_sec: number | null };
};

export type ParseVideoUrlResponse = {
  ok: boolean;
  platform: 'youtube' | 'unknown';
  originalUrl: string;
  normalizedUrl: string;
  videoId: string | null;
  reason?: string;
};

export type VideoMetaResponse = {
  code: '0' | '1';
  message: string;
  data: {
    title: string | null;
    author: string | null;
    thumbnail: string | null;
    url: string;
    video_id: string | null;
    video_platform: 'youtube';
    source: 'oembed';
    duration_seconds?: number | null;
  } | null;
};

export async function runThumbnailPipeline(
  token: string | null,
  body: PipelineRunRequest,
): Promise<PipelineRunResponse> {
  return fetchJson<PipelineRunResponse>(ApiRoutes.thumbnails.pipelineRun, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createThumbnailPipelineJob(
  token: string | null,
  body: PipelineRunRequest,
): Promise<PipelineJobSubmitResponse> {
  return fetchJson<PipelineJobSubmitResponse>(ApiRoutes.thumbnails.pipelineJobCreate, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getThumbnailPipelineJob(
  token: string | null,
  jobId: string,
): Promise<PipelineJobStatusResponse> {
  return fetchJson<PipelineJobStatusResponse>(ApiRoutes.thumbnails.pipelineJobOne(jobId), token);
}

export async function runThumbnailPipelineVideo(
  token: string | null,
  params: PipelineVideoRunRequest,
): Promise<PipelineJobSubmitResponse> {
  const {
    file,
    videoUrl,
    project_id,
    count,
    style,
    prompt,
    template_id,
    avatar_id,
    prioritize_face,
    image_model_tier,
  } = params;
  const form = new FormData();
  if (file) form.append('file', file);
  if (videoUrl?.trim()) form.append('videoUrl', videoUrl.trim());
  if (project_id?.trim()) form.append('project_id', project_id.trim());
  if (count !== undefined) form.append('count', String(count));
  if (style?.trim()) form.append('style', style.trim());
  if (prompt?.trim()) form.append('prompt', prompt.trim());
  if (template_id?.trim()) form.append('template_id', template_id.trim());
  if (avatar_id?.trim()) form.append('avatar_id', avatar_id.trim());
  if (prioritize_face === true) form.append('prioritize_face', 'true');
  if (image_model_tier) form.append('image_model_tier', image_model_tier);
  return fetchMultipart<PipelineJobSubmitResponse>(ApiRoutes.thumbnails.pipelineRunVideo, token, form);
}

export async function parseVideoUrl(token: string | null, rawUrl: string): Promise<ParseVideoUrlResponse> {
  const qs = new URLSearchParams({ url: rawUrl.trim() }).toString();
  return fetchJson<ParseVideoUrlResponse>(`${ApiRoutes.thumbnails.parseUrl}?${qs}`, token);
}

export async function getVideoMeta(token: string | null, videoUrl: string): Promise<VideoMetaResponse> {
  return fetchJson<VideoMetaResponse>(ApiRoutes.thumbnails.getVideoMeta, token, {
    method: 'POST',
    body: JSON.stringify({ video_url: videoUrl.trim() }),
  });
}
