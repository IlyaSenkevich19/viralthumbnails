import { Injectable, Logger } from '@nestjs/common';
import { PIPELINE_STEP_MODELS } from '@/config/openrouter-models';
import { extractJsonObject } from '@/common/json/extract-json-object';
import { approximateOpenRouterMessagesPayloadChars } from '../../openrouter/approximate-message-payload-chars';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { userContentTextVideoThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';
import {
  ThumbnailPipelineAnalysis,
  ThumbnailPipelineAnalysisJsonPrompt,
  ThumbnailPipelineAnalysisSchema,
} from '../schemas/thumbnail-pipeline-analysis.schema';

const MAX_JSON_RETRIES = 2;

export type VideoUnderstandingParams = {
  userPrompt: string;
  style?: string;
  videoUrl?: string;
  templateReferenceDataUrls?: string[];
  faceReferenceDataUrls?: string[];
};

export type VideoUnderstandingResult = {
  analysis: ThumbnailPipelineAnalysis;
  modelUsed: string;
};

/**
 * Vision-language analysis for thumbnail strategy (video URL and/or reference images).
 * Uses {@link PIPELINE_STEP_MODELS} (code defaults), then optional fallback on total failure.
 */
@Injectable()
export class PipelineVideoUnderstandingService {
  private readonly logger = new Logger(PipelineVideoUnderstandingService.name);

  constructor(private readonly openRouter: OpenRouterClient) {}

  async analyze(params: VideoUnderstandingParams): Promise<VideoUnderstandingResult> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const primary = PIPELINE_STEP_MODELS.vlPrimary;
    const fallback = PIPELINE_STEP_MODELS.vlFallback?.trim() || undefined;
    const models = fallback && fallback !== primary ? [primary, fallback] : [primary];

    let lastErr: Error | null = null;
    for (const model of models) {
      try {
        const analysis = await this.analyzeWithModel(model, params);
        return { analysis, modelUsed: model };
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        this.logger.warn(`Pipeline VL model=${model} failed: ${lastErr.message}`);
      }
    }

    throw lastErr ?? new Error('Video understanding failed');
  }

  private buildMessages(params: VideoUnderstandingParams, fixHint: string): OpenRouterMessage[] {
    const styleLine = params.style?.trim() ? `Preferred visual style: ${params.style.trim()}` : '';
    const system = `You are an expert YouTube thumbnail director. ${styleLine}
${ThumbnailPipelineAnalysisJsonPrompt}`;

    const templateUrls = params.templateReferenceDataUrls ?? [];
    const faceUrls = params.faceReferenceDataUrls ?? [];
    const refNote =
      templateUrls.length || faceUrls.length
        ? '\n\nAttached images order: template reference(s) first (if any), then face reference(s) (if any). Use them for likeness, layout, or palette — do not invent on-screen branding that contradicts them.'
        : '';

    const videoNote = params.videoUrl?.trim()
      ? 'A video is attached; ground timing fields in what you see.'
      : 'No video is attached; infer carefully from the text prompt and any reference images. Use startSec 0 when unknown.';

    const userText = `Analyze for YouTube thumbnail strategy and output JSON only.${refNote}\n\n${videoNote}\n\nCreator prompt:\n${params.userPrompt.trim()}${fixHint}`;

    const orderedImages = [...templateUrls, ...faceUrls];
    const userContent: OpenRouterMessage['content'] = userContentTextVideoThenReferenceImages(
      userText,
      params.videoUrl?.trim(),
      orderedImages,
    );

    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];
  }

  private async analyzeWithModel(
    model: string,
    params: VideoUnderstandingParams,
  ): Promise<ThumbnailPipelineAnalysis> {
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt <= MAX_JSON_RETRIES; attempt++) {
      const fixHint =
        attempt > 0
          ? '\nYour previous reply was invalid. Reply with ONLY compact valid JSON matching the schema, no prose.'
          : '';

      const messages: OpenRouterMessage[] =
        attempt === 0
          ? this.buildMessages(params, fixHint)
          : [
              ...this.buildMessages(params, ''),
              { role: 'user', content: `Fix your output.${fixHint}` },
            ];

      try {
        const result = await this.openRouter.chatCompletions({
          model,
          messages,
          temperature: attempt > 0 ? 0.1 : 0.3,
          maxTokens: 8192,
        });

        this.logger.log(
          `Pipeline video understanding model=${model} latencyMs=${result.latencyMs} approxTextChars=${approximateOpenRouterMessagesPayloadChars(messages)}`,
        );

        const extracted = extractJsonObject(result.rawText);
        const parsed = JSON.parse(extracted) as unknown;
        const validated = ThumbnailPipelineAnalysisSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
        lastErr = new Error(validated.error.message);
        this.logger.warn(`Pipeline analysis JSON schema fail (attempt ${attempt + 1}): ${lastErr.message}`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        this.logger.warn(`Pipeline analysis attempt ${attempt + 1} failed: ${lastErr.message}`);
      }
    }

    throw lastErr ?? new Error('Pipeline video understanding failed');
  }
}
