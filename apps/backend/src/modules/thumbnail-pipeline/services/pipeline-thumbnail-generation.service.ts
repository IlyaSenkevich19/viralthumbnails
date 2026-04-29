import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import {
  type ThumbnailImageModelTier,
  getOpenRouterThumbnailImageModel,
} from '../../../config/openrouter-models';
import { OpenRouterApiError } from '../../openrouter/openrouter-api.error';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/openrouter-requests';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';
import type { ReferenceBundle } from './pipeline-prompt-builder.service';

const MULTIMODAL_HEADER =
  'Generate a single 16:9 YouTube thumbnail image. After this paragraph, reference images appear in order: selected video frame if present, then template reference(s), then face reference if present.';

export type GeneratedPipelineImage = {
  index: number;
  prompt: string;
  buffer: Buffer;
  contentType: string;
};

@Injectable()
export class PipelineThumbnailGenerationService {
  private readonly logger = new Logger(PipelineThumbnailGenerationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  imageModel(tier: ThumbnailImageModelTier = 'default'): string {
    return getOpenRouterThumbnailImageModel(tier);
  }

  async generateVariants(params: {
    prompts: string[];
    reference?: ReferenceBundle;
    imageModelTier?: ThumbnailImageModelTier;
    onProgress?: (progress: { current: number; total: number; percent: number }) => Promise<void>;
  }): Promise<GeneratedPipelineImage[]> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.imageModel(params.imageModelTier ?? 'default');
    const refUrls = params.reference?.dataUrls ?? [];
    const useMultimodal = refUrls.length > 0;
    const timeoutMs = getOpenRouterConfig(this.config).projectGenTimeoutMs;

    const out: GeneratedPipelineImage[] = [];
    const total = params.prompts.length;
    for (let i = 0; i < params.prompts.length; i++) {
      const prompt = params.prompts[i];
      try {
        const content: OpenRouterMessage['content'] = useMultimodal
          ? userContentTextThenReferenceImages(`${MULTIMODAL_HEADER}\n\n${prompt.slice(0, 2500)}`, refUrls)
          : prompt;

        const img = await requestOpenRouterSingleThumbnailImage({
          openRouter: this.openRouter,
          model,
          messages: [{ role: 'user', content }],
          timeoutMs,
          logger: this.logger,
          logContext: `pipeline gen index=${i}`,
        });
        if (!img) {
          this.logger.warn(`Pipeline image gen: no image in response index=${i} model=${model}`);
          continue;
        }
        out.push({ index: i, prompt, buffer: img.buffer, contentType: img.contentType });
      } catch (e) {
        if (e instanceof OpenRouterApiError) {
          // Do not swallow billing / rate limits / upstream errors as "no images".
          throw e;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('timed out')) {
          this.logger.warn(`Pipeline image gen timed out index=${i} after ${timeoutMs}ms`);
        } else {
          this.logger.warn(`Pipeline image gen failed index=${i}: ${msg}`);
        }
      }
      await params.onProgress?.({
        current: Math.min(i + 1, total),
        total,
        percent: total > 0 ? Math.round(((i + 1) / total) * 100) : 100,
      });
    }

    return out;
  }
}
