import { Injectable } from '@nestjs/common';
import {
  resolveThumbnailStyleInstruction,
} from '../../../common/thumbnail-prompt-guidelines';
import { generateOptimizedThumbnailPrompt } from '../../../common/optimized-thumbnail-prompt';
import type { ThumbnailPipelineAnalysis } from '../schemas/thumbnail-pipeline-analysis.schema';

export type ReferenceBundle = {
  dataUrls: string[];
  hasVideoFrame?: boolean;
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
      const keyMessage = title.split(/\s+/).slice(0, 4).join(' ');
      const description = [
        `Main subject: ${analysis.mainSubject}`,
        `Scene: ${analysis.sceneSummary}`,
        `Emotion: ${analysis.emotion}`,
        `Concept: ${seed}`,
        `Visual hook: ${hook}`,
        `Composition: ${comp}`,
        `Creator notes: ${userPrompt.slice(0, 500)}`,
      ].join('. ');
      out.push(
        generateOptimizedThumbnailPrompt({
          description,
          keyMessage,
          niche: style?.trim() || 'YouTube thumbnail',
          style: [styleInstruction, styleLine].filter(Boolean).join(' '),
          avoid: analysis.negativeCues,
          variantFocus: i % 3 === 0 ? 'face-focus' : i % 3 === 1 ? 'text-focus' : 'symbol-focus',
        }) + (neg ? `\n\nNEGATIVE CUES: ${neg}` : ''),
      );
    }
    return out;
  }

  referenceInstructionLine(refs?: ReferenceBundle): string {
    if (!refs?.dataUrls?.length) return '';
    const { hasVideoFrame, hasTemplateImage, hasFaceImage, prioritizeFace } = refs;
    const frameText = hasVideoFrame
      ? ' The first attached image is the model-selected video frame: use it as the main visual truth for subject, scene, emotion, and composition.'
      : '';
    const templateText = hasTemplateImage
      ? hasVideoFrame
        ? ' Template reference(s) follow the selected frame: borrow layout energy, safe margins, typography, and structure without overriding the selected moment.'
        : ' The first attached image(s) are layout/style template reference(s): match composition, safe margins, typography energy, and structure; adapt colors to the topic.'
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
    return `${frameText}${templateText}${faceText}`;
  }
}
