import { Injectable } from '@nestjs/common';
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
  private static readonly STYLE_PRESETS: ReadonlyArray<{
    key: string;
    aliases: string[];
    instruction: string;
  }> = [
    {
      key: 'bold-hook',
      aliases: ['bold hook', 'hook', 'bold'],
      instruction:
        'Style direction: bold hook. One dominant focal subject, dramatic contrast, punchy colors, clear visual hierarchy, and a short high-impact headline.',
    },
    {
      key: 'clean-minimal',
      aliases: ['clean minimal', 'minimal', 'clean'],
      instruction:
        'Style direction: clean minimal. Bright but controlled exposure, restrained saturation, neutral background, minimal clutter, generous negative space, and ultra-legible typography. Avoid blown highlights and washed-out whites.',
    },
    {
      key: 'emotional-reaction',
      aliases: ['emotional reaction', 'reaction', 'emotion'],
      instruction:
        'Style direction: emotional reaction. Emphasize expressive face/body language, tight crop, clear emotional storytelling, and supporting context only where it amplifies the reaction.',
    },
    {
      key: 'authority-educational',
      aliases: ['authority / educational', 'authority', 'educational', 'education'],
      instruction:
        'Style direction: authority/educational. Professional framing, trustworthy look, tidy composition, clear topic framing, and confident but not sensational visual tone.',
    },
    {
      key: 'curiosity-gap',
      aliases: ['curiosity gap', 'curiosity'],
      instruction:
        'Style direction: curiosity gap. Reveal enough context to intrigue, hide the full answer, use visual contrast between known vs unknown elements, and keep the core mystery obvious.',
    },
    {
      key: 'news-urgency',
      aliases: ['news / urgency', 'news', 'urgency', 'breaking'],
      instruction:
        'Style direction: news/urgency. Time-sensitive energy, crisp high-contrast composition, unmistakable key subject, and concise headline with urgency cues without becoming noisy.',
    },
  ];

  private styleInstruction(style: string | undefined, index: number): string {
    const raw = style?.trim();
    if (!raw) {
      return PipelinePromptBuilderService.STYLE_PRESETS[
        index % PipelinePromptBuilderService.STYLE_PRESETS.length
      ].instruction;
    }
    const normalized = raw.toLowerCase();
    const matched = PipelinePromptBuilderService.STYLE_PRESETS.find((preset) =>
      preset.aliases.some((alias) => normalized.includes(alias)),
    );
    if (matched) return matched.instruction;
    return `Style direction: ${raw}. Keep this style explicit and visually consistent across layout, color, and typography.`;
  }

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
      const styleInstruction = this.styleInstruction(style, i);
      out.push(
        `YouTube thumbnail 16:9, professional quality. ${styleInstruction} ${styleLine} ${neg} Main subject: ${analysis.mainSubject}. Emotion: ${analysis.emotion}. Concept: ${seed}. On-image title idea (max 3-5 words, very large readable text): "${title}". Visual hook: ${hook}. Composition: ${comp}. Keep one primary subject and avoid clutter. Creator notes: ${userPrompt.slice(0, 500)}`,
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
