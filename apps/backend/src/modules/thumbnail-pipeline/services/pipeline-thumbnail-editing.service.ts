import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { OpenRouterApiError } from '../../openrouter/openrouter-api.error';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/openrouter-requests';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';
import {
  formatOpenRouterMultimodalTruncationWarning,
  sliceOpenRouterMultimodalUserText,
} from '../../../common/optimized-thumbnail-prompt';

const EDIT_HEADER =
  'You are editing an existing 16:9 YouTube thumbnail. After this paragraph: first image is the current thumbnail; following images are template and/or face references in that order. Apply the edit instructions while preserving readability and contrast. Never place text over the face, eyes, mouth, hands, or main object.';

const VIDEO_FRAME_EDIT_HEADER =
  'Create a finished 16:9 YouTube thumbnail by editing the first attached image, which is a real selected frame from the source video. Preserve the real people, setting, and story beat, but you may crop, reframe, darken/blur background, improve lighting, separate the subject, and create clean negative space for text. Following images, if present, are template/style references and then face references. Do not invent artificial arrows, red circles, yellow dots, target rings, fake highlights, or annotation overlays unless explicitly requested by the creator. Never place text over the face, eyes, mouth, hands, or main object.';

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
  }): Promise<{ buffer: Buffer; contentType: string; warnings?: string[] }> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.editModel();
    const templates = params.templateReferenceDataUrls ?? [];
    const faces = params.faceReferenceDataUrls ?? [];
    const ordered = [params.baseImageDataUrl, ...templates, ...faces];

    const instructionTrim = sliceOpenRouterMultimodalUserText(params.instruction.trim());
    const body = `${EDIT_HEADER}\n\n${instructionTrim.text}`;
    const content: OpenRouterMessage['content'] = userContentTextThenReferenceImages(body, ordered);
    const trimWarning =
      instructionTrim.droppedChars > 0
        ? formatOpenRouterMultimodalTruncationWarning('thumbnail pipeline base-image edit', instructionTrim)
        : null;
    if (trimWarning) {
      this.logger.warn(`[vt-multimodal-prompt] ${trimWarning}`);
    }

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
      return {
        buffer: img.buffer,
        contentType: img.contentType,
        warnings: trimWarning ? [trimWarning] : undefined,
      };
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
    variantBaseFrameDataUrls?: string[];
    prompts: string[];
    templateReferenceDataUrls?: string[];
    faceReferenceDataUrls?: string[];
    prioritizeFace?: boolean;
    onProgress?: (progress: { current: number; total: number; percent: number }) => Promise<void>;
  }): Promise<{ variants: EditedPipelineImage[]; warnings: string[] }> {
    if (!this.openRouter.getApiKey()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const model = this.editModel();
    const templates = params.templateReferenceDataUrls ?? [];
    const faces = params.faceReferenceDataUrls ?? [];
    const timeoutMs = getOpenRouterConfig(this.config).projectGenTimeoutMs;
    const out: EditedPipelineImage[] = [];
    const warnings: string[] = [];
    const total = params.prompts.length;
    let worstMultimodalTrim: { droppedChars: number; originalLen: number } | undefined;

    const referencePolicy = [
      templates.length
        ? 'Use template reference(s) only as a layout system: text zone, subject zone, hierarchy, typography energy, spacing, and safe zones. Do not replace the video scene with the template content. Do not copy template annotation marks such as arrows, circles, target rings, or yellow dots.'
        : '',
      faces.length
        ? params.prioritizeFace
          ? 'Face reference has priority for likeness: make the main person recognizable while keeping the source video setting and story beat believable.'
          : 'Use the face reference softly for likeness if it fits, but keep the source video person and scene believable.'
        : 'No face reference was provided: preserve the person/people from the source video frame.',
    ]
      .filter(Boolean)
      .join('\n');

    for (let i = 0; i < params.prompts.length; i++) {
      const prompt = params.prompts[i];
      const baseFrameDataUrl = params.variantBaseFrameDataUrls?.[i] ?? params.baseFrameDataUrl;
      const ordered = [baseFrameDataUrl, ...templates, ...faces];
      const instructionTrim = sliceOpenRouterMultimodalUserText(prompt.trim());
      if (instructionTrim.droppedChars > 0) {
        if (!worstMultimodalTrim || instructionTrim.droppedChars > worstMultimodalTrim.droppedChars) {
          worstMultimodalTrim = {
            droppedChars: instructionTrim.droppedChars,
            originalLen: instructionTrim.originalLen,
          };
        }
      }
      const body = `${VIDEO_FRAME_EDIT_HEADER}\n\n${referencePolicy}\n\nNegative overlay rules: no artificial red circles, no arrows, no yellow dots, no target rings, no fake annotation graphics, no fake UI markers.\n\nEdit instructions:\n${instructionTrim.text}`;
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

    if (worstMultimodalTrim) {
      const msg = formatOpenRouterMultimodalTruncationWarning(
        'thumbnail pipeline video-frame edit',
        worstMultimodalTrim,
      );
      warnings.push(msg);
      this.logger.warn(`[vt-multimodal-prompt] ${msg}`);
    }

    return { variants: out, warnings };
  }
}
