import type { OpenRouterDecodedImage } from './openrouter.types';

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/i;

function decodeFromImageUrlPart(o: Record<string, unknown>): OpenRouterDecodedImage | null {
  if (o.type !== 'image_url' || !o.image_url || typeof o.image_url !== 'object') {
    return null;
  }
  const url = (o.image_url as { url?: string }).url;
  if (typeof url !== 'string' || !url.startsWith('data:')) {
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
