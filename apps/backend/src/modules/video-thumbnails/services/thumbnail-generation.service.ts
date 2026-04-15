import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../../openrouter/request-openrouter-thumbnail-image';
import { userContentTextThenReferenceImages } from '../../openrouter/multipart-user-content';
import type { VideoAnalysis } from '../schemas/video-analysis.schema';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

const MULTIMODAL_HEADER =
  'Generate a single 16:9 YouTube thumbnail image. After this paragraph, reference images appear in order (template first, then face if present).';

export type GeneratedThumbnailCandidate = {
  prompt: string;
  buffer: Buffer;
  contentType: string;
  seedIndex: number;
};

type FromVideoReferenceImages = {
  dataUrls: string[];
  hasTemplateImage: boolean;
  hasAvatarImage: boolean;
  prioritizeFace: boolean;
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
    creativePrompt?: string;
    referenceImages?: FromVideoReferenceImages;
  }): Promise<GeneratedThumbnailCandidate[]> {
    const { analysis, count, style, creativePrompt, referenceImages } = params;
    const model = this.imageModel();
    const neg = analysis.negativeConstraints.length
      ? `Avoid: ${analysis.negativeConstraints.join('; ')}.`
      : '';
    const styleLine = style?.trim() ? `Style: ${style.trim()}.` : '';
    const creativeLine = creativePrompt?.trim()
      ? ` Creator notes: ${creativePrompt.trim()}.`
      : '';
    const refLine = this.referenceInstructionLine(referenceImages);
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
        `YouTube thumbnail 16:9, bold readable title text, high contrast, professional. ${styleLine} ${neg} Concept: ${seed}${angle ? ` Angle: ${angle}.` : ''}${creativeLine}${refLine}`,
      );
    }

    const refUrls = referenceImages?.dataUrls ?? [];
    const useMultimodal = refUrls.length > 0;
    const timeoutMs = getOpenRouterConfig(this.config).projectGenTimeoutMs;

    const out: GeneratedThumbnailCandidate[] = [];
    for (let i = 0; i < targets.length; i++) {
      const prompt = targets[i];
      try {
        const content: OpenRouterMessage['content'] = useMultimodal
          ? userContentTextThenReferenceImages(`${MULTIMODAL_HEADER}\n\n${prompt.slice(0, 2500)}`, refUrls)
          : prompt;

        const messages: OpenRouterMessage[] = [{ role: 'user', content }];

        const img = await requestOpenRouterSingleThumbnailImage({
          openRouter: this.openRouter,
          model,
          messages,
          timeoutMs,
          logger: this.logger,
          logContext: `from-video seed=${i}`,
        });
        if (!img) {
          this.logger.warn(`No image in OpenRouter response for seed ${i} model=${model}`);
          continue;
        }
        out.push({ prompt, buffer: img.buffer, contentType: img.contentType, seedIndex: i });
      } catch (e) {
        this.logger.warn(`Thumbnail gen failed seed ${i}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return out;
  }

  private referenceInstructionLine(referenceImages?: FromVideoReferenceImages): string {
    if (!referenceImages?.dataUrls?.length) {
      return '';
    }
    const { hasTemplateImage, hasAvatarImage, prioritizeFace } = referenceImages;
    const templateText = hasTemplateImage
      ? ' The first attached image is a layout/style template: match composition, safe margins, typography energy, and overall structure; adapt colors to fit the topic.'
      : '';
    const faceText =
      hasAvatarImage && hasTemplateImage
        ? prioritizeFace
          ? ' The image after the template is the on-camera person: prioritize a recognizable likeness (face, hair, skin tone). They should be the main human subject.'
          : ' The image after the template is a face reference for the main person; keep them recognizable and well-lit.'
        : hasAvatarImage
          ? prioritizeFace
            ? ' The attached image is the on-camera person: prioritize a recognizable likeness; they should be the main human subject.'
            : ' The attached image is a face reference for the main person; keep them recognizable and well-lit.'
          : '';
    return `${templateText}${faceText}`;
  }
}
