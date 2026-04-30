import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { OpenRouterApiError } from '../../openrouter/openrouter-api.error';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/openrouter-requests';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

const EDIT_HEADER =
  'You are editing an existing 16:9 YouTube thumbnail. After this paragraph: first image is the current thumbnail; following images are template and/or face references in that order. Apply the edit instructions while preserving readability and contrast.';

const VIDEO_FRAME_EDIT_HEADER =
  'Create a finished 16:9 YouTube thumbnail by editing the first attached image, which is a real selected frame from the source video. Preserve the real scene, person, pose, and visual truth from this first image unless a face reference explicitly asks for likeness replacement. Following images, if present, are template/style references and then face references.';

export type EditedPipelineImage = {
  index: number;
  prompt: string;
  buffer: Buffer;
  contentType: string;
};

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

  async editVideoFrameVariants(params: {
    baseFrameDataUrl: string;
    prompts: string[];
    templateReferenceDataUrls?: string[];
    faceReferenceDataUrls?: string[];
    prioritizeFace?: boolean;
    onProgress?: (progress: { current: number; total: number; percent: number }) => Promise<void>;
  }): Promise<EditedPipelineImage[]> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.editModel();
    const templates = params.templateReferenceDataUrls ?? [];
    const faces = params.faceReferenceDataUrls ?? [];
    const ordered = [params.baseFrameDataUrl, ...templates, ...faces];
    const timeoutMs = getOpenRouterConfig(this.config).projectGenTimeoutMs;
    const out: EditedPipelineImage[] = [];
    const total = params.prompts.length;

    const referencePolicy = [
      templates.length
        ? 'Use template reference(s) only for layout energy, typography, spacing, and safe zones. Do not replace the video scene with the template content.'
        : '',
      faces.length
        ? params.prioritizeFace
          ? 'Use the face reference to make the main person recognizable while keeping the original video pose, lighting direction, and thumbnail composition.'
          : 'Use the face reference softly for likeness if it fits, but keep the source video person and scene believable.'
        : 'No face reference was provided: preserve the person/people from the source video frame.',
    ]
      .filter(Boolean)
      .join('\n');

    for (let i = 0; i < params.prompts.length; i++) {
      const prompt = params.prompts[i];
      const body = `${VIDEO_FRAME_EDIT_HEADER}\n\n${referencePolicy}\n\nEdit instructions:\n${prompt.trim().slice(0, 2400)}`;
      const content: OpenRouterMessage['content'] = userContentTextThenReferenceImages(body, ordered);
      try {
        const img = await requestOpenRouterSingleThumbnailImage({
          openRouter: this.openRouter,
          model,
          messages: [{ role: 'user', content }],
          timeoutMs,
          temperature: 0.35,
          logger: this.logger,
          logContext: `pipeline video-frame edit index=${i}`,
        });
        if (!img) {
          this.logger.warn(`Pipeline video-frame edit: no image in response index=${i} model=${model}`);
          continue;
        }
        out.push({ index: i, prompt, buffer: img.buffer, contentType: img.contentType });
      } catch (e) {
        if (e instanceof OpenRouterApiError) {
          throw e;
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('timed out')) {
          this.logger.warn(`Pipeline video-frame edit timed out index=${i} after ${timeoutMs}ms`);
        } else {
          this.logger.warn(`Pipeline video-frame edit failed index=${i}: ${msg}`);
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
