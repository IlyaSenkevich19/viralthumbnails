import { Injectable } from '@nestjs/common';
import {
  THUMBNAIL_PROMPT_QUALITY_GUARDRAILS,
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

const DEFAULT_DO_NOT_COVER_REGIONS = [
  'face',
  'eyes',
  'mouth',
  'hands',
  'main object',
  'lower-right timestamp area',
];

function cleanInline(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function compactHook(value: string | undefined, fallback: string): string {
  const cleaned = cleanInline(value || fallback);
  if (!cleaned) return fallback;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && cleaned.length <= 34) return cleaned;
  return words.slice(0, 4).join(' ');
}

function compactList(values: Array<string | undefined>, fallback: string): string {
  return values.map(cleanInline).filter(Boolean).join('. ') || fallback;
}

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
    videoUrl?: string;
    count: number;
  }): string[] {
    const { analysis, userPrompt, style, videoUrl, count } = params;
    const neg = analysis.negativeCues.length
      ? `Avoid: ${analysis.negativeCues.join('; ')}.`
      : '';
    const styleLine = style?.trim() ? `Style: ${style.trim()}.` : '';
    const seeds = analysis.imageGenerationPromptSuggestions;
    const titles = analysis.thumbnailTextIdeas;
    const hooks = analysis.visualHooks;
    const compositions = analysis.compositionSuggestions;
    const moments = analysis.thumbnailMoments ?? [];
    const doNotCoverRegions = analysis.doNotCoverRegions?.length
      ? analysis.doNotCoverRegions
      : DEFAULT_DO_NOT_COVER_REGIONS;

    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const moment = moments[i % Math.max(1, moments.length)];
      const seed = seeds[i % seeds.length];
      const title = titles[i % titles.length];
      const hook = moment?.visualHook ?? hooks[i % hooks.length];
      const comp = compositions[i % compositions.length];
      const styleInstruction = resolveThumbnailStyleInstruction(style, i);
      const keyMessage = compactHook(moment?.thumbnailText ?? analysis.primaryHookText ?? title, title);
      const description = [
        `Main subject: ${analysis.mainSubject}`,
        `Scene: ${analysis.sceneSummary}`,
        analysis.visualFrameDescription ? `Selected frame: ${analysis.visualFrameDescription}` : '',
        `Emotion: ${analysis.emotion}`,
        `Click reason: ${moment?.why ?? analysis.selectedFrameWhy ?? analysis.bestThumbnailMoment.why}`,
        `Viewer curiosity: ${analysis.viewerCuriosity ?? hook}`,
        `Concept: ${moment?.label ? `${moment.label}. ${seed}` : seed}`,
        `Visual hook: ${hook}`,
        `Composition: ${comp}`,
        `Layout strategy: ${compactList(
          [analysis.textPlacement, analysis.subjectPlacement, analysis.layoutRationale],
          comp,
        )}`,
        `Creator notes: ${userPrompt.slice(0, 280)}`,
      ]
        .filter(Boolean)
        .join('. ');
      out.push(
        generateOptimizedThumbnailPrompt({
          videoUrl,
          description,
          keyMessage,
          niche: style?.trim() || 'YouTube thumbnail',
          style: [THUMBNAIL_PROMPT_QUALITY_GUARDRAILS, styleInstruction, styleLine]
            .filter(Boolean)
            .join(' '),
          avoid: [
            ...analysis.negativeCues,
            'artificial red circles',
            'arrows',
            'yellow dots',
            'target rings',
            'fake annotation overlays',
          ],
          viewerCuriosity: analysis.viewerCuriosity,
          hookRationale: analysis.hookRationale ?? moment?.why ?? analysis.selectedFrameWhy,
          textPlacement: analysis.textPlacement,
          subjectPlacement: analysis.subjectPlacement,
          layoutRationale: analysis.layoutRationale,
          doNotCoverRegions,
          variantFocus: i % 3 === 0 ? 'face-focus' : i % 3 === 1 ? 'text-focus' : 'scene-focus',
        }) + (neg ? `\n\nNEGATIVE CUES: ${neg}` : ''),
      );
    }
    return out;
  }

  referenceInstructionLine(refs?: ReferenceBundle): string {
    if (!refs?.dataUrls?.length) return '';
    const { hasVideoFrame, hasTemplateImage, hasFaceImage, prioritizeFace } = refs;
    const frameText = hasVideoFrame
      ? ' The first attached image is the model-selected video frame: use it as the source truth for people, setting, emotion, and story beat; crop/recompose it into a designed YouTube thumbnail rather than placing text on top of the raw screenshot.'
      : '';
    const templateText = hasTemplateImage
      ? hasVideoFrame
        ? ' Template reference(s) follow the selected frame: use them only for text zone, subject zone, hierarchy, safe margins, typography, and structure without overriding the selected moment; do not copy circles, arrows, yellow dots, or annotation overlays from templates.'
        : ' The first attached image(s) are layout/style template reference(s): use them only for composition, safe margins, typography energy, text zone, and subject zone; adapt colors to the topic; do not copy circles, arrows, yellow dots, or annotation overlays.'
      : '';
    const faceText =
      hasFaceImage && hasTemplateImage
        ? prioritizeFace
          ? ' Face reference after template(s): prioritize recognizable likeness as the main human subject while preserving the source/topic story.'
          : ' Face reference after template(s): keep the person recognizable and well-lit.'
        : hasFaceImage
          ? prioritizeFace
            ? ' The attached face reference: prioritize recognizable likeness as the main human subject while preserving the source/topic story.'
            : ' The attached face reference: keep the person recognizable and well-lit.'
          : '';
    return `${frameText}${templateText}${faceText}`;
  }

  attachReferenceInstruction(prompt: string, refLine: string): string {
    const cleanedRef = cleanInline(refLine);
    if (!cleanedRef) return prompt;
    return `REFERENCE PRIORITY\n- ${cleanedRef}\n\n${prompt}`;
  }
}
