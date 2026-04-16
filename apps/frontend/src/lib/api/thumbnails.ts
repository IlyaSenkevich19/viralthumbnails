import { ApiRoutes } from '@/config/api-routes';
import { fetchJson, fetchMultipart } from './fetch-json';

export type PipelineVideoRunRequest = {
  file?: File;
  videoUrl?: string;
  count?: number;
  style?: string;
  prompt?: string;
  template_id?: string;
  avatar_id?: string;
  prioritize_face?: boolean;
};

/** @deprecated use `PipelineVideoRunRequest` */
export type FromVideoRequest = PipelineVideoRunRequest;

export type PipelineRunRequest = {
  user_prompt: string;
  style?: string;
  video_url?: string;
  template_reference_data_urls?: string[];
  template_id?: string;
  face_reference_data_urls?: string[];
  avatar_id?: string;
  variant_count?: number;
  generate_images?: boolean;
  prioritize_face?: boolean;
  base_image_data_url?: string;
  edit_instruction?: string;
  persist_project?: boolean;
};

export type PipelineRunResponse = {
  run_id: string;
  credits_charged: number;
  analysis: Record<string, unknown>;
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

export async function runThumbnailPipelineVideo(
  token: string | null,
  params: PipelineVideoRunRequest,
): Promise<PipelineRunResponse> {
  const { file, videoUrl, count, style, prompt, template_id, avatar_id, prioritize_face } = params;
  const form = new FormData();
  if (file) form.append('file', file);
  if (videoUrl?.trim()) form.append('videoUrl', videoUrl.trim());
  if (count !== undefined) form.append('count', String(count));
  if (style?.trim()) form.append('style', style.trim());
  if (prompt?.trim()) form.append('prompt', prompt.trim());
  if (template_id?.trim()) form.append('template_id', template_id.trim());
  if (avatar_id?.trim()) form.append('avatar_id', avatar_id.trim());
  if (prioritize_face === true) form.append('prioritize_face', 'true');
  return fetchMultipart<PipelineRunResponse>(ApiRoutes.thumbnails.pipelineRunVideo, token, form);
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
