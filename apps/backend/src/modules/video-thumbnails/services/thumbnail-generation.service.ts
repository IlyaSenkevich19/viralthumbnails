import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import type { VideoAnalysis } from '../schemas/video-analysis.schema';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

export type GeneratedThumbnailCandidate = {
  prompt: string;
  buffer: Buffer;
  contentType: string;
  seedIndex: number;
};

@Injectable()
export class ThumbnailGenerationService {
  private readonly logger = new Logger(ThumbnailGenerationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  imageModel(): string {
    return getOpenRouterConfig(this.config).imageModel;
  }

  /**
   * Build up to `count` image candidates from analysis.promptSeeds (and angles as hints).
   */
  async generateCandidates(params: {
    analysis: VideoAnalysis;
    count: number;
    style?: string;
  }): Promise<GeneratedThumbnailCandidate[]> {
    const { analysis, count, style } = params;
    const model = this.imageModel();
    const neg = analysis.negativeConstraints.length
      ? `Avoid: ${analysis.negativeConstraints.join('; ')}.`
      : '';
    const styleLine = style?.trim() ? `Style: ${style.trim()}.` : '';
    const seeds = analysis.promptSeeds.slice(0, 12);
    if (seeds.length === 0) {
      return [];
    }
    const angles = analysis.thumbnailAngles.length ? analysis.thumbnailAngles : [''];
    const targets: string[] = [];
    for (let i = 0; i < count; i++) {
      const seed = seeds[i % seeds.length];
      const angle = angles[i % angles.length];
      targets.push(
        `YouTube thumbnail 16:9, bold readable title text, high contrast, professional. ${styleLine} ${neg} Concept: ${seed}${angle ? ` Angle: ${angle}.` : ''}`,
      );
    }

    const out: GeneratedThumbnailCandidate[] = [];
    for (let i = 0; i < targets.length; i++) {
      const prompt = targets[i];
      try {
        const messages: OpenRouterMessage[] = [
          {
            role: 'user',
            content: prompt,
          },
        ];

        const result = await this.openRouter.chatCompletions({
          model,
          messages,
          modalities: ['image', 'text'],
          temperature: 0.5,
          maxTokens: 8192,
        });

        const imgs = this.openRouter.extractImagesFromParts(result.contentParts);
        if (imgs.length === 0) {
          this.logger.warn(`No image in OpenRouter response for seed ${i} model=${model}`);
          continue;
        }
        const first = imgs[0];
        const buffer = Buffer.from(first.base64, 'base64');
        if (!buffer.length) continue;
        const contentType = first.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
        out.push({ prompt, buffer, contentType, seedIndex: i });
      } catch (e) {
        this.logger.warn(`Thumbnail gen failed seed ${i}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return out;
  }
}
