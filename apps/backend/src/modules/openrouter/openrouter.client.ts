import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import { extractImagesFromOpenRouterParts, getOpenRouterPartImageUrl } from './extract-images-from-parts';
import { OpenRouterApiError } from './openrouter-api.error';
import type {
  OpenRouterChatResult,
  OpenRouterDecodedImage,
  OpenRouterMessage,
  OpenRouterUsage,
} from './openrouter.types';

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | unknown[];
      images?: unknown[];
    };
  }>;
  usage?: OpenRouterUsage;
  model?: string;
  error?: { message?: string };
};

function urlFromAssistantImageEntry(img: unknown): string | null {
  if (typeof img === 'string' && img.trim()) return img.trim();
  if (img && typeof img === 'object') return getOpenRouterPartImageUrl(img as Record<string, unknown>);
  return null;
}

@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name);

  constructor(private readonly config: ConfigService) {}

  getApiKey(): string | undefined {
    return getOpenRouterConfig(this.config).apiKey;
  }

  async chatCompletions(params: {
    model: string;
    messages: OpenRouterMessage[];
    modalities?: string[];
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }): Promise<OpenRouterChatResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const or = getOpenRouterConfig(this.config);
    const base = or.baseUrl.replace(/\/$/, '');
    const url = `${base}/chat/completions`;
    const referer =
      or.httpReferer || this.config.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';

    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      stream: false,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 4096,
    };
    if (params.modalities?.length) {
      body.modalities = params.modalities;
    }

    const started = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': referer,
        'X-OpenRouter-Title': or.appTitle,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });

    const latencyMs = Date.now() - started;
    const rawText = await res.text();
    let json: ChatCompletionsResponse;
    try {
      json = JSON.parse(rawText) as ChatCompletionsResponse;
    } catch {
      /** Truncate: error bodies may echo user prompts from some providers. */
      this.logger.warn(`OpenRouter non-JSON response (${res.status}): ${rawText.slice(0, 200)}`);
      throw new Error(`OpenRouter: invalid JSON (${res.status})`);
    }

    if (!res.ok) {
      const providerMessage = (json.error?.message || rawText.slice(0, 400)).trim();
      const mapped = this.mapOpenRouterError(res.status, providerMessage);
      this.logger.warn(
        `OpenRouter error ${res.status} code=${mapped.code} model=${params.model} latencyMs=${latencyMs} ${providerMessage}`,
      );
      throw new OpenRouterApiError(res.status, mapped.code, mapped.message);
    }

    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    const parts = Array.isArray(content) ? content : [];
    const messageImages: unknown[] = choice?.message?.images ?? [];
    const imagePartsFromImages = messageImages
      .map((img) => {
        const url = urlFromAssistantImageEntry(img);
        if (!url) return null;
        return { type: 'image_url' as const, image_url: { url } };
      })
      .filter((p): p is { type: 'image_url'; image_url: { url: string } } => p !== null);
    const text =
      typeof content === 'string'
        ? content
        : parts
            .map((p) => {
              if (p && typeof p === 'object' && 'text' in p && typeof (p as { text: string }).text === 'string') {
                return (p as { text: string }).text;
              }
              return '';
            })
            .join('');

    this.logger.log(
      `OpenRouter ok model=${params.model} latencyMs=${latencyMs} usage=${JSON.stringify(json.usage ?? {})}`,
    );

    return {
      rawText: text,
      contentParts:
        parts.length || imagePartsFromImages.length
          ? [...parts, ...imagePartsFromImages]
          : typeof content === 'string'
            ? [{ type: 'text', text: content }]
            : [],
      usage: json.usage ?? null,
      model: json.model ?? params.model,
      latencyMs,
    };
  }

  extractImagesFromParts(parts: unknown[]): OpenRouterDecodedImage[] {
    return extractImagesFromOpenRouterParts(parts);
  }

  private mapOpenRouterError(status: number, providerMessage: string): { code: string; message: string } {
    if (
      status === 402 &&
      /at least\s*\$?1(\.0+)?\s+in balance.*video/i.test(providerMessage)
    ) {
      return {
        code: 'OPENROUTER_VIDEO_BALANCE_REQUIRED',
        message:
          'OpenRouter requires at least $1 balance for video analysis requests. Top up your OpenRouter account or run without video_url.',
      };
    }
    if (status === 402) {
      return {
        code: 'OPENROUTER_BILLING_REQUIRED',
        message: 'OpenRouter billing requirement not met. Please check your account balance and billing status.',
      };
    }
    if (status === 400) {
      return {
        code: 'OPENROUTER_BAD_REQUEST',
        message:
          providerMessage.trim().length > 0
            ? `OpenRouter: ${providerMessage}`
            : 'OpenRouter rejected the request (400). Check that the model supports video_url / YouTube for this route.',
      };
    }
    if (status === 429) {
      return {
        code: 'OPENROUTER_RATE_LIMIT',
        message: 'OpenRouter rate limit reached. Please retry in a moment.',
      };
    }
    if (status >= 500) {
      return {
        code: 'OPENROUTER_UPSTREAM_ERROR',
        message: 'OpenRouter upstream error. Please retry shortly.',
      };
    }
    const hint = providerMessage.trim().length > 0 ? `: ${providerMessage}` : '';
    return {
      code: 'OPENROUTER_REQUEST_FAILED',
      message: `OpenRouter request failed (${status})${hint}`,
    };
  }
}
