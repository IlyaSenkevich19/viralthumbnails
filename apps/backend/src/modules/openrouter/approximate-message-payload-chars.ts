import type { OpenRouterMessage } from './openrouter.types';

/**
 * Approximate size of text parts only (for metrics). Does not stringify image/video URLs
 * so logs never embed base64 from `data:image/...` attachments.
 */
export function approximateOpenRouterMessagesPayloadChars(messages: OpenRouterMessage[]): number {
  let n = 0;
  for (const m of messages) {
    const c = m.content;
    if (typeof c === 'string') {
      n += c.length;
    } else if (Array.isArray(c)) {
      for (const part of c) {
        if (!part || typeof part !== 'object') continue;
        const p = part as { type?: string; text?: string };
        if (p.type === 'text' && typeof p.text === 'string') n += p.text.length;
        else if (p.type === 'image_url' || p.type === 'video_url') n += 32;
      }
    }
  }
  return n;
}
