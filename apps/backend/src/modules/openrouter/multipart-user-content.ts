import type { OpenRouterContentPart } from './openrouter.types';

/**
 * Builds a user `content` array for OpenRouter multimodal chat.
 * Docs recommend putting the text prompt before `image_url` / `video_url` parts so providers parse reliably.
 *
 * @see OpenRouter docs: sending images via `chat/completions` (text before `image_url` in `content`).
 */
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
