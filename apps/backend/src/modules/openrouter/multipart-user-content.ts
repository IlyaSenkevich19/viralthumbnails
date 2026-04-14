import type { OpenRouterContentPart } from './openrouter.types';

export function userContentTextThenImageUrl(
  instruction: string,
  /** Public HTTPS URL or `data:image/...;base64,...` */
  imageUrlOrDataUrl: string,
): OpenRouterContentPart[] {
  return [
    { type: 'text', text: instruction },
    { type: 'image_url', image_url: { url: imageUrlOrDataUrl } },
  ];
}

export function userContentTextThenVideoUrl(instruction: string, videoUrl: string): OpenRouterContentPart[] {
  return [
    { type: 'text', text: instruction },
    { type: 'video_url', video_url: { url: videoUrl } },
  ];
}

export function userContentTextThenReferenceImages(
  instruction: string,
  imageUrlOrDataUrls: string[],
): OpenRouterContentPart[] {
  if (imageUrlOrDataUrls.length === 0) {
    return [{ type: 'text', text: instruction }];
  }
  const parts: OpenRouterContentPart[] = [{ type: 'text', text: instruction }];
  for (const url of imageUrlOrDataUrls) {
    parts.push({ type: 'image_url', image_url: { url } });
  }
  return parts;
}

/**
 * Multimodal context for pipeline analysis: optional video, then reference images
 * (callers should document order in the instruction text, e.g. template then face).
 */
export function userContentTextVideoThenReferenceImages(
  instruction: string,
  videoUrl: string | undefined,
  imageUrlOrDataUrls: string[],
): OpenRouterContentPart[] {
  const parts: OpenRouterContentPart[] = [{ type: 'text', text: instruction }];
  if (videoUrl?.trim()) {
    parts.push({ type: 'video_url', video_url: { url: videoUrl.trim() } });
  }
  for (const url of imageUrlOrDataUrls) {
    const u = url?.trim();
    if (u) parts.push({ type: 'image_url', image_url: { url: u } });
  }
  return parts;
}
