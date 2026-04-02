import { ApiRoutes } from '@/config/api-routes';
import type { FromVideoResponse } from '@/lib/types/from-video';
import { fetchMultipart } from './fetch-json';

export type FromVideoRequest = {
  file?: File;
  videoUrl?: string;
  count?: number;
  style?: string;
};

export async function fromVideoThumbnails(
  token: string | null,
  params: FromVideoRequest,
): Promise<FromVideoResponse> {
  const { file, videoUrl, count, style } = params;
  const form = new FormData();
  if (file) form.append('file', file);
  if (videoUrl?.trim()) form.append('videoUrl', videoUrl.trim());
  if (count !== undefined) form.append('count', String(count));
  if (style?.trim()) form.append('style', style.trim());

  return fetchMultipart<FromVideoResponse>(ApiRoutes.thumbnails.fromVideo, token, form);
}
