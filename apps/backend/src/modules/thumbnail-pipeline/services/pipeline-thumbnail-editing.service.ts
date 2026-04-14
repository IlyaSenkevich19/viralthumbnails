import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { PIPELINE_STEP_MODELS } from '../config/pipeline-step-models';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), or.projectGenTimeoutMs);

    try {
      const result = await this.openRouter.chatCompletions({
        model,
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
        temperature: 0.35,
        maxTokens: 8192,
        signal: controller.signal,
      });

      const imgs = this.openRouter.extractImagesFromParts(result.contentParts);
      if (imgs.length === 0) {
        throw new Error('Pipeline image edit: no image in model response');
      }
      const first = imgs[0];
      const buffer = Buffer.from(first.base64, 'base64');
      if (!buffer.length) throw new Error('Pipeline image edit: empty buffer');
      const contentType = first.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
      return { buffer, contentType };
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        this.logger.warn(`Pipeline image edit timed out after ${or.projectGenTimeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
}
