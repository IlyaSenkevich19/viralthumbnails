import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { extractJsonObject } from '@/common/json/extract-json-object';
import { approximateOpenRouterMessagesPayloadChars } from '../../openrouter/approximate-message-payload-chars';
import {
  VideoAnalysis,
  VideoAnalysisJsonPrompt,
  VideoAnalysisSchema,
} from '../schemas/video-analysis.schema';
import { userContentTextThenVideoUrl } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

const MAX_JSON_RETRIES = 2;

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  videoModel(): string {
    return getOpenRouterConfig(this.config).videoModel;
  }

  async analyze(videoUrl: string, style?: string, creativePrompt?: string): Promise<VideoAnalysis> {
    const model = this.videoModel();
    const styleLine = style?.trim() ? `Preferred visual style: ${style.trim()}` : '';

    const system = `You are an expert YouTube thumbnail director. ${styleLine}
${VideoAnalysisJsonPrompt}`;

    const direction = creativePrompt?.trim()
      ? `\n\nCreator direction (use when choosing scenes, angles, and prompt seeds): ${creativePrompt.trim()}`
      : '';
    const userContent: OpenRouterMessage['content'] = userContentTextThenVideoUrl(
      `Analyze this video and output the JSON object only.${direction}`,
      videoUrl,
    );

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= MAX_JSON_RETRIES; attempt++) {
      const fixHint =
        attempt > 0
          ? '\nYour previous reply was invalid. Reply with ONLY compact valid JSON matching the schema, no prose.'
          : '';

      const msgs: OpenRouterMessage[] =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: 'user',
                content: `Fix your output.${fixHint}`,
              },
            ];

      try {
        const result = await this.openRouter.chatCompletions({
          model,
          messages: msgs,
          temperature: attempt > 0 ? 0.1 : 0.3,
          maxTokens: 8192,
        });

        this.logger.log(
          `video analysis model=${model} latencyMs=${result.latencyMs} approxTextChars=${approximateOpenRouterMessagesPayloadChars(msgs)}`,
        );

        const extracted = extractJsonObject(result.rawText);
        const parsed = JSON.parse(extracted) as unknown;
        const validated = VideoAnalysisSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data;
        }
        lastErr = new Error(validated.error.message);
        this.logger.warn(`Video analysis JSON schema fail (attempt ${attempt + 1}): ${lastErr.message}`);
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        this.logger.warn(`Video analysis attempt ${attempt + 1} failed: ${lastErr.message}`);
      }
    }

    throw lastErr ?? new Error('Video analysis failed');
  }
}
