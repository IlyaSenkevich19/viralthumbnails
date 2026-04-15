import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/request-openrouter-thumbnail-image';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

const EDIT_HEADER =
  'You are editing an existing 16:9 YouTube thumbnail. After this paragraph: first image is the current thumbnail; following images are template and/or face references in that order. Apply the edit instructions while preserving readability and contrast.';

/**
 * Separate image-editing / remix layer (face insertion, template adaptation).
 * Model: {@link PIPELINE_STEP_MODELS.imageEdit}.
 */
@Injectable()
export class PipelineThumbnailEditingService {
  private readonly logger = new Logger(PipelineThumbnailEditingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  editModel(): string {
    return PIPELINE_STEP_MODELS.imageEdit;
  }

  async editThumbnail(params: {
    baseImageDataUrl: string;
    instruction: string;
    templateReferenceDataUrls?: string[];
    faceReferenceDataUrls?: string[];
  }): Promise<{ buffer: Buffer; contentType: string }> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.editModel();
    const templates = params.templateReferenceDataUrls ?? [];
    const faces = params.faceReferenceDataUrls ?? [];
    const ordered = [params.baseImageDataUrl, ...templates, ...faces];

    const body = `${EDIT_HEADER}\n\n${params.instruction.trim().slice(0, 2500)}`;
    const content: OpenRouterMessage['content'] = userContentTextThenReferenceImages(body, ordered);

    const or = getOpenRouterConfig(this.config);
    const timeoutMs = or.projectGenTimeoutMs;

    try {
      const img = await requestOpenRouterSingleThumbnailImage({
        openRouter: this.openRouter,
        model,
        messages: [{ role: 'user', content }],
        timeoutMs,
        temperature: 0.35,
        logger: this.logger,
        logContext: 'pipeline edit',
      });
      if (!img) {
        throw new Error('Pipeline image edit: no image in model response');
      }
      return { buffer: img.buffer, contentType: img.contentType };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('timed out')) {
        this.logger.warn(`Pipeline image edit timed out after ${timeoutMs}ms`);
      }
      throw e;
    }
  }
}
