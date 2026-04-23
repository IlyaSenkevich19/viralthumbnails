import { Injectable } from '@nestjs/common';
import {
  THUMBNAIL_PROMPT_QUALITY_GUARDRAILS,
  resolveThumbnailStyleInstruction,
} from '../../../common/thumbnail-prompt-guidelines';
import type { ThumbnailPipelineAnalysis } from '../schemas/thumbnail-pipeline-analysis.schema';

export type ReferenceBundle = {
  dataUrls: string[];
  hasTemplateImage: boolean;
  hasFaceImage: boolean;
  prioritizeFace: boolean;
};

/**
 * Turns structured analysis + creator notes into concrete image-model prompts.
 * Pure logic — no network; models are swapped only in generation / VL services.
 */
@Injectable()
export class PipelinePromptBuilderService {
  buildFinalImagePrompts(params: {
    analysis: ThumbnailPipelineAnalysis;
    userPrompt: string;
    style?: string;
    count: number;
  }): string[] {
    const { analysis, userPrompt, style, count } = params;
    const neg = analysis.negativeCues.length
      ? `Avoid: ${analysis.negativeCues.join('; ')}.`
      : '';
    const styleLine = style?.trim() ? `Style: ${style.trim()}.` : '';
    const seeds = analysis.imageGenerationPromptSuggestions;
    const titles = analysis.thumbnailTextIdeas;
    const hooks = analysis.visualHooks;
    const compositions = analysis.compositionSuggestions;

    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const seed = seeds[i % seeds.length];
      const title = titles[i % titles.length];
      const hook = hooks[i % hooks.length];
      const comp = compositions[i % compositions.length];
      const styleInstruction = resolveThumbnailStyleInstruction(style, i);
      out.push(
        `YouTube thumbnail 16:9, professional quality. ${THUMBNAIL_PROMPT_QUALITY_GUARDRAILS} ${styleInstruction} ${styleLine} ${neg} Main subject: ${analysis.mainSubject}. Emotion: ${analysis.emotion}. Concept: ${seed}. On-image title idea (max 3-5 words, very large readable text): "${title}". Visual hook: ${hook}. Composition: ${comp}. Keep one primary subject and avoid clutter. Creator notes: ${userPrompt.slice(0, 500)}`,
      );
    }
    return out;
  }

  referenceInstructionLine(refs?: ReferenceBundle): string {
    if (!refs?.dataUrls?.length) return '';
    const { hasTemplateImage, hasFaceImage, prioritizeFace } = refs;
    const templateText = hasTemplateImage
      ? ' The first attached image(s) are layout/style template reference(s): match composition, safe margins, typography energy, and structure; adapt colors to the topic.'
      : '';
    const faceText =
      hasFaceImage && hasTemplateImage
        ? prioritizeFace
          ? ' Face reference after template(s): prioritize a recognizable likeness; they should be the main human subject.'
          : ' Face reference after template(s): keep the person recognizable and well-lit.'
        : hasFaceImage
          ? prioritizeFace
            ? ' The attached face reference: prioritize recognizable likeness as the main human subject.'
            : ' The attached face reference: keep the person recognizable and well-lit.'
          : '';
    return `${templateText}${faceText}`;
  }
}
