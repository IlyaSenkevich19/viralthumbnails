import type { Logger } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import type { OpenRouterMessage } from './openrouter.types';

/**
 * Single OpenRouter chat completion with image+text modalities; returns the first decoded image or null.
 * On HTTP timeout throws `Error` with message containing `timed out` (wraps `AbortError`).
 */
export async function requestOpenRouterSingleThumbnailImage(params: {
  openRouter: OpenRouterClient;
  model: string;
  messages: OpenRouterMessage[];
  timeoutMs: number;
  temperature?: number;
  maxTokens?: number;
  logger: Logger;
  logContext: string;
}): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  const temperature = params.temperature ?? 0.5;
  const maxTokens = params.maxTokens ?? 8192;
  try {
    const result = await params.openRouter.chatCompletions({
      model: params.model,
      messages: params.messages,
      modalities: ['image', 'text'],
      temperature,
      maxTokens,
      signal: controller.signal,
    });

    const imgs = params.openRouter.extractImagesFromParts(result.contentParts);
    if (imgs.length === 0) {
      const remote = await tryFetchRemoteImageFromContentParts(result.contentParts, params.logger);
      if (remote) return remote;
      params.logger.warn(`OpenRouter thumbnail: no image context=${params.logContext} model=${params.model}`);
      return null;
    }
    const first = imgs[0];
    const buffer = Buffer.from(first.base64, 'base64');
    if (!buffer.length) {
      params.logger.warn(`OpenRouter thumbnail: empty buffer context=${params.logContext}`);
      return null;
    }
    const contentType = first.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
    return { buffer, contentType };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`OpenRouter image gen: request timed out after ${params.timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFetchRemoteImageFromContentParts(
  parts: unknown[],
  logger: Logger,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const o = p as { type?: unknown; image_url?: { url?: unknown } };
    if (o.type !== 'image_url') continue;
    const url = typeof o.image_url?.url === 'string' ? o.image_url.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`OpenRouter thumbnail: image url fetch failed status=${res.status}`);
        continue;
      }
      const contentTypeHeader = res.headers.get('content-type') || '';
      const contentType = contentTypeHeader.toLowerCase().includes('jpeg') ? 'image/jpeg' : 'image/png';
      const ab = await res.arrayBuffer();
      const buffer = Buffer.from(ab);
      if (!buffer.length) continue;
      logger.log(`OpenRouter thumbnail: image fetched from remote URL (${contentType})`);
      return { buffer, contentType };
    } catch (e) {
      logger.warn(
        `OpenRouter thumbnail: image url fetch error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  return null;
}
