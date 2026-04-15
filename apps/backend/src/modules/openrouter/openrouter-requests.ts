import type { Logger } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';
import { getOpenRouterPartImageUrl } from './extract-images-from-parts';
import type { OpenRouterChatResult, OpenRouterMessage } from './openrouter.types';

export type OpenRouterChatCompletionsParams = {
  model: string;
  messages: OpenRouterMessage[];
  modalities?: string[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export async function openRouterChatCompletion(
  client: OpenRouterClient,
  params: OpenRouterChatCompletionsParams,
): Promise<OpenRouterChatResult> {
  return client.chatCompletions(params);
}

const PIPELINE_TEXT_REFINEMENT_SYSTEM =
  'You are a YouTube thumbnail creative director. Rewrite the creator notes into 3-6 short imperative lines (angles, emotion, text on thumbnail, what to avoid). Plain text only, no JSON.';

export async function requestPipelineTextRefinement(
  client: OpenRouterClient,
  params: { model: string; userDirection: string },
): Promise<OpenRouterChatResult> {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: PIPELINE_TEXT_REFINEMENT_SYSTEM },
    { role: 'user', content: params.userDirection.slice(0, 8000) },
  ];
  return openRouterChatCompletion(client, {
    model: params.model,
    messages,
    temperature: 0.35,
    maxTokens: 1024,
  });
}

export async function requestPipelineVlAnalysis(
  client: OpenRouterClient,
  params: {
    model: string;
    messages: OpenRouterMessage[];
    temperature: number;
    maxTokens?: number;
    signal?: AbortSignal;
  },
): Promise<OpenRouterChatResult> {
  return openRouterChatCompletion(client, {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    maxTokens: params.maxTokens ?? 8192,
    signal: params.signal,
  });
}

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
    // Sourceful Riverflow: docs recommend `modalities: ['image']`; some models expect `['image','text']`.
    let result = await openRouterChatCompletion(params.openRouter, {
      model: params.model,
      messages: params.messages,
      modalities: ['image'],
      temperature,
      maxTokens,
      signal: controller.signal,
    });

    let imgs = params.openRouter.extractImagesFromParts(result.contentParts);
    let remote =
      imgs.length === 0 ? await tryFetchRemoteImageFromContentParts(result.contentParts, params.logger) : null;

    if (imgs.length === 0 && !remote) {
      params.logger.warn(
        `OpenRouter thumbnail: retry with image+text modalities context=${params.logContext} model=${params.model}`,
      );
      result = await openRouterChatCompletion(params.openRouter, {
        model: params.model,
        messages: params.messages,
        modalities: ['image', 'text'],
        temperature,
        maxTokens,
        signal: controller.signal,
      });
      imgs = params.openRouter.extractImagesFromParts(result.contentParts);
      remote =
        imgs.length === 0 ? await tryFetchRemoteImageFromContentParts(result.contentParts, params.logger) : null;
    }

    if (imgs.length === 0) {
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
    const o = p as Record<string, unknown>;
    const url = getOpenRouterPartImageUrl(o);
    if (!url || !/^https?:\/\//i.test(url)) continue;

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
