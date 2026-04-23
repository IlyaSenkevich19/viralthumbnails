export type ThumbnailStylePreset = {
  key: string;
  aliases: string[];
  instruction: string;
};

export const THUMBNAIL_STYLE_PRESETS: ReadonlyArray<ThumbnailStylePreset> = [
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
] as const;

export const THUMBNAIL_PROMPT_QUALITY_GUARDRAILS =
  'Hard requirements: output 16:9 only; one dominant subject; very high contrast; ultra-legible on-image text (max 3-5 words, very large). YouTube energy: bold hook, punchy focal point, not a slide deck or tiny distant figure. If a person appears: tight close-up or strong medium shot so the face is large; sharp eyes and natural skin texture; single clear key light; avoid plastic, wax, or doll-like skin, and avoid a tiny face lost in the frame. Keep clean safe margins for mobile crops. Avoid clutter, micro-text, watermark/logo hallucinations, unreadable gibberish, and low-contrast overlays.';

/** How strongly the result should show an on-camera person (project "Generate" flow). */
export type ThumbnailFaceInImage = 'default' | 'with_face' | 'faceless';

/**
 * User-facing copy for the API; `default` means no extra constraint beyond template + refs.
 * Keep in sync with {@link ThumbnailFaceInImage}.
 */
export const THUMBNAIL_FACE_IN_IMAGE_VALUES: readonly ThumbnailFaceInImage[] = [
  'default',
  'with_face',
  'faceless',
] as const;

export function isThumbnailFaceInImage(value: unknown): value is ThumbnailFaceInImage {
  return typeof value === 'string' && (THUMBNAIL_FACE_IN_IMAGE_VALUES as readonly string[]).includes(value);
}

/**
 * Appended to image model prompts for project thumbnail generation; empty when `default` or unknown.
 */
export function resolveFaceInThumbnailInstruction(mode: ThumbnailFaceInImage | undefined): string {
  if (!mode || mode === 'default') {
    return '';
  }
  if (mode === 'with_face') {
    return 'On-camera subject: tight framing — one person’s face must be large in frame, well-lit, sharp, photoreal skin (not waxy or doll-like), strong emotion matching the topic; eyes and mouth readable at small YouTube size.';
  }
  return 'Faceless mode: do not depict any people or recognizable human faces (no portraits). Prefer bold text, product or screen-focused staging, environment, or abstract/illustration look. If a layout reference image shows a person, reinterpret the same composition with non-human focal elements while keeping the same energy.';
}

export function resolveThumbnailStyleInstruction(style: string | undefined, index: number): string {
  const raw = style?.trim();
  if (!raw) {
    return THUMBNAIL_STYLE_PRESETS[index % THUMBNAIL_STYLE_PRESETS.length].instruction;
  }
  const normalized = raw.toLowerCase();
  const matched = THUMBNAIL_STYLE_PRESETS.find((preset) =>
    preset.aliases.some((alias) => normalized.includes(alias)),
  );
  if (matched) return matched.instruction;
  return `Style direction: ${raw}. Keep this style explicit and visually consistent across layout, color, and typography.`;
}
