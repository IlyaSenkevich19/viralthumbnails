import type { OpenRouterDecodedImage } from './openrouter.types';

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/i;

/** OpenRouter may use `image_url` (API) or `imageUrl` (some SDKs) on the same part. */
export function getOpenRouterPartImageUrl(o: Record<string, unknown>): string | null {
  for (const key of ['image_url', 'imageUrl'] as const) {
    const nested = o[key];
    if (nested && typeof nested === 'object' && 'url' in nested) {
      const u = (nested as { url?: unknown }).url;
      if (typeof u === 'string' && u.trim()) return u.trim();
    }
  }
  if (typeof o.url === 'string' && o.url.trim()) return o.url.trim();
  return null;
}

function decodeFromImageUrlPart(o: Record<string, unknown>): OpenRouterDecodedImage | null {
  const url = getOpenRouterPartImageUrl(o);
  if (!url || !url.startsWith('data:')) {
    return null;
  }
  const m = DATA_URL_RE.exec(url);
  return m ? { mime: m[1], base64: m[2] } : null;
}

function decodeFromImageSourcePart(o: Record<string, unknown>): OpenRouterDecodedImage | null {
  if (o.type !== 'image' || typeof o.source !== 'object' || !o.source) {
    return null;
  }
  const s = o.source as { type?: string; data?: string; media_type?: string };
  if (s.type !== 'base64' || typeof s.data !== 'string') {
    return null;
  }
  return { mime: s.media_type || 'image/png', base64: s.data };
}

/**
 * Collects inline images from OpenRouter / OpenAI-style assistant message `content` parts.
 */
export function extractImagesFromOpenRouterParts(parts: unknown[]): OpenRouterDecodedImage[] {
  const out: OpenRouterDecodedImage[] = [];
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const fromUrl = decodeFromImageUrlPart(o);
    if (fromUrl) out.push(fromUrl);
    const fromSource = decodeFromImageSourcePart(o);
    if (fromSource) out.push(fromSource);
  }
  return out;
}
