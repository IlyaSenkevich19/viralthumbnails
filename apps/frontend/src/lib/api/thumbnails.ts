import { ApiRoutes } from '@/config/api-routes';
import type { FromVideoResponse } from '@/lib/types/from-video';
import { fetchJson, fetchMultipart } from './fetch-json';

export type FromVideoRequest = {
  file?: File;
  videoUrl?: string;
  count?: number;
  style?: string;
  prompt?: string;
  template_id?: string;
  avatar_id?: string;
  prioritize_face?: boolean;
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
  } | null;
};

export async function fromVideoThumbnails(
  token: string | null,
  params: FromVideoRequest,
): Promise<FromVideoResponse> {
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

  return fetchMultipart<FromVideoResponse>(ApiRoutes.thumbnails.fromVideo, token, form);
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
