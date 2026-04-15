import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { PIPELINE_STEP_MODELS } from '@/config/openrouter-models';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/request-openrouter-thumbnail-image';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';
import type { ReferenceBundle } from './pipeline-prompt-builder.service';

const MULTIMODAL_HEADER =
  'Generate a single 16:9 YouTube thumbnail image. After this paragraph, reference images appear in order (template(s) first, then face if present).';

export type GeneratedPipelineImage = {
  index: number;
  prompt: string;
  buffer: Buffer;
  contentType: string;
};

/**
 * Image generation for the modular pipeline — model from {@link PIPELINE_STEP_MODELS.imageGeneration}.
 */
@Injectable()
export class PipelineThumbnailGenerationService {
  private readonly logger = new Logger(PipelineThumbnailGenerationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  imageModel(): string {
    return PIPELINE_STEP_MODELS.imageGeneration;
  }

  async generateVariants(params: {
    prompts: string[];
    reference?: ReferenceBundle;
  }): Promise<GeneratedPipelineImage[]> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.imageModel();
    const refUrls = params.reference?.dataUrls ?? [];
    const useMultimodal = refUrls.length > 0;
    const timeoutMs = getOpenRouterConfig(this.config).projectGenTimeoutMs;

    const out: GeneratedPipelineImage[] = [];
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
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('timed out')) {
          this.logger.warn(`Pipeline image gen timed out index=${i} after ${timeoutMs}ms`);
        } else {
          this.logger.warn(`Pipeline image gen failed index=${i}: ${msg}`);
        }
      }
    }

    return out;
  }
}
