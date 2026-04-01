import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import type { OpenRouterChatResult, OpenRouterMessage, OpenRouterUsage } from './openrouter.types';

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | unknown[];
      role?: string;
    };
  }>;
  usage?: OpenRouterUsage;
  model?: string;
  error?: { message?: string };
};

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
    const base = or.baseUrl;
    const url = `${base.replace(/\/$/, '')}/chat/completions`;
    const referer =
      or.httpReferer ||
      this.config.get<string>('FRONTEND_URL')?.trim() ||
      'http://localhost:3000';
    const title = or.appTitle;

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
        'X-Title': title,
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
      this.logger.warn(`OpenRouter non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
      throw new Error(`OpenRouter: invalid JSON (${res.status})`);
    }

    if (!res.ok) {
      const msg = json.error?.message || rawText.slice(0, 400);
      this.logger.warn(`OpenRouter error ${res.status} model=${params.model} latencyMs=${latencyMs} ${msg}`);
      throw new Error(`OpenRouter: ${res.status} ${msg}`);
    }

    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    const parts = Array.isArray(content) ? content : [];
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
      contentParts: parts.length ? parts : typeof content === 'string' ? [{ type: 'text', text: content }] : [],
      usage: json.usage ?? null,
      model: json.model ?? params.model,
      latencyMs,
    };
  }

  extractImagesFromParts(parts: unknown[]): Array<{ mime: string; base64: string }> {
    const out: Array<{ mime: string; base64: string }> = [];
    for (const p of parts) {
      if (!p || typeof p !== 'object') continue;
      const o = p as Record<string, unknown>;
      if (o.type === 'image_url' && o.image_url && typeof o.image_url === 'object') {
        const u = (o.image_url as { url?: string }).url;
        if (typeof u === 'string' && u.startsWith('data:')) {
          const m = /^data:([^;]+);base64,(.+)$/i.exec(u);
          if (m) out.push({ mime: m[1], base64: m[2] });
        }
      }
      if (o.type === 'image' && typeof o.source === 'object' && o.source) {
        const s = o.source as { type?: string; data?: string; media_type?: string };
        if (s.type === 'base64' && typeof s.data === 'string') {
          out.push({ mime: s.media_type || 'image/png', base64: s.data });
        }
      }
    }
    return out;
  }
}
