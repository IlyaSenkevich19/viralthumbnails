export interface ThumbnailInput {
  videoUrl?: string;
  description: string;
  keyMessage: string;
  niche: string;
  style?: string;
  avoid?: string[];
  variantFocus?: ThumbnailPromptVariantFocus;
  viewerCuriosity?: string;
  hookRationale?: string;
  textPlacement?: string;
  subjectPlacement?: string;
  layoutRationale?: string;
  doNotCoverRegions?: string[];
}

export type ThumbnailPromptVariantFocus = 'face-focus' | 'text-focus' | 'scene-focus';

export type PromptComplianceResult = {
  score: number;
  passed: number;
  total: number;
  missing: string[];
};

type PromptCheck = {
  label: string;
  pattern: RegExp;
};

type VariantStrategy = {
  name: string;
  hook: string;
  layout: string;
  subject: string;
  background: string;
  color: string;
};

export const ULTIMATE_THUMBNAIL_CHECKLIST_RULES =
  '16:9 1280x720. Max 3 elements: one focal subject, one 1-4 word text hook, and one clean supporting object only if it is natural to the scene. Build visual hierarchy: attention first, interest second, curiosity third. If a face appears, it must be expressive with emotion and eye contact. Never place text over a face, eyes, mouth, hands, or the main object; reserve a clean text area in negative space. Do not add artificial arrows, red circles, yellow dots, target rings, check/cross marks, or fake annotation overlays unless the creator explicitly asks for them. Use bold sans-serif text, black/white/yellow with outline. High contrast, bright complementary colors, blurred/darkened background, safe lower-right timestamp zone, no right-edge text, no logos, no watermark, no emojis, no clutter. Make it legible at mobile size, accurate to the video, niche-appropriate, professional, crisp high-res.';

const VARIANT_STRATEGIES: Record<ThumbnailPromptVariantFocus, VariantStrategy> = {
  'face-focus': {
    name: 'FACE-FOCUS',
    hook: 'Primary click driver is emotion and eye contact.',
    layout:
      'Large expressive face on the left or upper-left third; text on the opposite side; no artificial annotation overlays.',
    subject:
      'Use the emotion implied by the video context, creator prompt, or selected frame. Prefer a clear, high-energy expression with eyes toward camera when it fits; do not force fear, shock, or negativity unless the source actually calls for it. Tight crop, readable expression, natural skin texture.',
    background:
      'Use the video/topic as blurred context behind the face. Keep background darkened enough for foreground pop.',
    color: 'Warm face lighting against cool/dark complementary background accents.',
  },
  'text-focus': {
    name: 'TEXT-FOCUS',
    hook: 'Primary click driver is a short benefit/FOMO text hook.',
    layout:
      'Large 1-4 word headline in a reserved clean area occupying about one third of the frame; do not cover the face, eyes, mouth, hands, or main object.',
    subject:
      'Show the object, scene, or person that proves the benefit. Crop/reposition the subject so it supports the text without sitting underneath it.',
    background:
      'Simple masked/blurred background with depth, not flat solid color unless intentionally premium/minimal.',
    color: 'Black/white/yellow headline with heavy outline over saturated contrasting background.',
  },
  'scene-focus': {
    name: 'SCENE-FOCUS',
    hook: 'Primary click driver is the real source scene, action, or surprising object.',
    layout:
      'Use a dramatic crop of the real scene or object as the visual hook; text stays short and secondary.',
    subject:
      'Make the real object, action, transformation, or conflict feel like the reveal viewers must click to understand.',
    background:
      'Keep surrounding context visible enough to understand the niche, but blur/darken anything distracting without adding fake markers.',
    color: 'Use cinematic contrast and selective lighting instead of arrows, circles, or target overlays.',
  },
};

const COMPLIANCE_CHECKS: readonly PromptCheck[] = [
  { label: '1280x720 / 16:9', pattern: /1280x720|16:9/i },
  { label: 'visual hierarchy', pattern: /visual hierarchy|attention first/i },
  { label: '3 element rule', pattern: /Max 3 elements|3 elements/i },
  { label: 'no logo/watermark/clutter', pattern: /no logos|watermark|clutter/i },
  { label: 'max 4 words', pattern: /1-4 word|4 words/i },
  { label: 'bold sans-serif', pattern: /bold sans-serif/i },
  { label: 'black white yellow outline', pattern: /black\/white\/yellow|outline/i },
  { label: 'curiosity / FOMO', pattern: /curiosity|FOMO|mystery/i },
  { label: 'shrink test', pattern: /mobile size|shrink/i },
  { label: 'emotional face', pattern: /expressive face|emotion|eye contact/i },
  { label: 'no artificial annotation overlays', pattern: /Do not add artificial|fake annotation/i },
  { label: 'high contrast', pattern: /High contrast/i },
  { label: 'safe zones', pattern: /safe lower-right|right edge|right-edge/i },
  { label: 'bright complementary colors', pattern: /bright complementary|saturated|complementary/i },
  { label: 'no wasted space', pattern: /Fill the frame|bleed edges|larger/i },
  { label: 'professional crisp high-res', pattern: /professional|crisp high-res/i },
  { label: 'accurate expectations', pattern: /accurate|no deceptive/i },
  { label: 'niche appropriate', pattern: /niche-appropriate|Niche/i },
];

function cleanInline(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function limitWords(value: string, maxWords: number): string {
  const words = cleanInline(value).split(' ').filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function fallbackHookForNiche(niche: string): string {
  const normalized = niche.toLowerCase();
  if (normalized.includes('gaming')) return 'SECRET REVEALED';
  if (normalized.includes('product') || normalized.includes('saas')) return '3X FASTER';
  if (normalized.includes('education') || normalized.includes('tutorial')) return 'LEARN THIS FAST';
  if (normalized.includes('finance')) return 'STOP LOSING MONEY';
  return 'WATCH THIS';
}

export function generateOptimizedThumbnailPrompt(input: ThumbnailInput): string {
  const description = cleanInline(input.description) || 'YouTube video thumbnail concept';
  const niche = cleanInline(input.niche) || 'YouTube';
  const keyMessage = cleanInline(input.keyMessage) || fallbackHookForNiche(niche);
  const shortText = limitWords(keyMessage, 4) || fallbackHookForNiche(niche);
  const videoUrl = cleanInline(input.videoUrl) || 'no URL';
  const style = cleanInline(input.style);
  const avoid = input.avoid?.map(cleanInline).filter(Boolean);
  const viewerCuriosity = cleanInline(input.viewerCuriosity);
  const hookRationale = cleanInline(input.hookRationale);
  const textPlacement = cleanInline(input.textPlacement);
  const subjectPlacement = cleanInline(input.subjectPlacement);
  const layoutRationale = cleanInline(input.layoutRationale);
  const doNotCoverRegions = input.doNotCoverRegions?.map(cleanInline).filter(Boolean);
  const strategy = VARIANT_STRATEGIES[input.variantFocus ?? 'face-focus'];

  return `
Create one production-quality YouTube thumbnail image, 1280x720, 16:9.

CREATIVE BRIEF
- Video context: ${description}
- Source URL: ${videoUrl}
- Niche: ${niche}
- Click promise: ${keyMessage}
- On-image text: "${shortText}" (exactly this idea, max 1-4 words, do not add extra text)
- Variant: ${strategy.name}. ${strategy.hook}
${viewerCuriosity ? `- Viewer curiosity: ${viewerCuriosity}` : ''}
${hookRationale ? `- Why this hook fits: ${hookRationale}` : ''}

LAYOUT
- ${strategy.layout}
- Fill the frame with the important elements; overlap or bleed edges when it makes the subject larger.
- Keep the lower-right timestamp area and right edge free from text or key details.
- Text placement: ${textPlacement || 'place text only in a clean negative-space area, never across the face or main object.'}
- Subject placement: ${subjectPlacement || 'crop/recompose so the subject is large and separated from the text zone.'}
${layoutRationale ? `- Layout rationale: ${layoutRationale}` : ''}
${doNotCoverRegions?.length ? `- Do not cover: ${doNotCoverRegions.join(', ')}.` : '- Do not cover: face, eyes, mouth, hands, main object, or lower-right timestamp area.'}

SUBJECT
- ${strategy.subject}

BACKGROUND
- ${strategy.background}

COLOR / TYPE
- ${strategy.color}
- Bold sans-serif type only; black/white/yellow text with thick outline or strong contrast.

STRICT RULES
- ${ULTIMATE_THUMBNAIL_CHECKLIST_RULES}
- Keep the thumbnail accurate to the video. Create curiosity, not deceptive clickbait.
- Do not invent fights, "versus" conflict, romantic drama, money claims, or shocking events unless the source clearly supports them.
- Do not repeat a long video title as text. Use the short hook only.
- If the source frame contains a person, keep the face readable and uncovered. Move the text, not the face.
- No artificial arrows, red circles, yellow dots, target rings, fake highlights, or annotation overlays unless explicitly requested.
- No logos, no watermarks, no emojis, no tiny text, no crowded UI screenshots, no amateur solid-color poster look.
${style ? `\nSTYLE DIRECTION\n- ${style}` : ''}
${avoid?.length ? `\nAVOID\n- ${avoid.join('\n- ')}` : ''}

Output ONLY the image. No captions, no explanations, no mockup frame.
  `.trim();
}

export function generateABVariants(input: ThumbnailInput): string[] {
  return (['face-focus', 'text-focus', 'scene-focus'] as const).map((variantFocus) =>
    generateOptimizedThumbnailPrompt({ ...input, variantFocus }),
  );
}

export function validatePrompt(prompt: string): PromptComplianceResult {
  const missing = COMPLIANCE_CHECKS.filter((check) => !check.pattern.test(prompt)).map(
    (check) => check.label,
  );
  const total = COMPLIANCE_CHECKS.length;
  const passed = total - missing.length;
  return {
    score: Math.round((passed / total) * 100),
    passed,
    total,
    missing,
  };
}

