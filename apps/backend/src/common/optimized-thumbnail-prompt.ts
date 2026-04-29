export interface ThumbnailInput {
  videoUrl?: string;
  description: string;
  keyMessage: string;
  niche: string;
  style?: string;
  avoid?: string[];
  variantFocus?: ThumbnailPromptVariantFocus;
}

export type ThumbnailPromptVariantFocus = 'face-focus' | 'text-focus' | 'symbol-focus';

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
  '16:9 1280x720. Max 3 elements: one focal subject, one 1-4 word text hook, optional one symbol. Build visual hierarchy: attention first, interest second, curiosity third. If a face appears, it must be expressive with emotion and eye contact. Symbols are limited to arrow/circle/check/cross/!? only. Use bold sans-serif text, black/white/yellow with outline. High contrast, bright complementary colors, blurred/darkened background, safe lower-right timestamp zone, no right-edge text, no logos, no watermark, no emojis, no clutter. Make it legible at mobile size, accurate to the video, niche-appropriate, professional, crisp high-res.';

const VARIANT_STRATEGIES: Record<ThumbnailPromptVariantFocus, VariantStrategy> = {
  'face-focus': {
    name: 'FACE-FOCUS',
    hook: 'Primary click driver is emotion and eye contact.',
    layout:
      'Large expressive face on the left or upper-left third; text on the opposite side; one small arrow/circle only if it creates curiosity.',
    subject:
      'Use surprise, fear, excitement, or intense realization. Eyes face camera. Tight crop, readable expression, natural skin texture.',
    background:
      'Use the video/topic as blurred context behind the face. Keep background darkened enough for foreground pop.',
    color: 'Warm face lighting against cool/dark complementary background accents.',
  },
  'text-focus': {
    name: 'TEXT-FOCUS',
    hook: 'Primary click driver is a short benefit/FOMO text hook.',
    layout:
      'Huge 1-4 word headline occupying one third of the frame; subject/product supports the promise; no extra captions.',
    subject:
      'Show the object, scene, or person that proves the benefit. Keep it secondary to the text hierarchy.',
    background:
      'Simple masked/blurred background with depth, not flat solid color unless intentionally premium/minimal.',
    color: 'Black/white/yellow headline with heavy outline over saturated contrasting background.',
  },
  'symbol-focus': {
    name: 'SYMBOL-FOCUS',
    hook: 'Primary click driver is a visual mystery marker.',
    layout:
      'One arrow, circle, check/cross, or !? points to a curiosity object. Text stays very short and secondary.',
    subject:
      'Make the circled/pointed object feel like the reveal viewers must click to understand.',
    background:
      'Keep surrounding context visible enough to understand the niche, but blur/darken anything distracting.',
    color: 'Use red/yellow symbol contrast against a darker complementary scene.',
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
  { label: 'allowed symbols only', pattern: /arrow|circle|check\/cross|!\?/i },
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

LAYOUT
- ${strategy.layout}
- Fill the frame with the important elements; overlap or bleed edges when it makes the subject larger.
- Keep the lower-right timestamp area and right edge free from text or key details.

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
- Do not repeat a long video title as text. Use the short hook only.
- No logos, no watermarks, no emojis, no tiny text, no crowded UI screenshots, no amateur solid-color poster look.
${style ? `\nSTYLE DIRECTION\n- ${style}` : ''}
${avoid?.length ? `\nAVOID\n- ${avoid.join('\n- ')}` : ''}

Output ONLY the image. No captions, no explanations, no mockup frame.
  `.trim();
}

export function generateABVariants(input: ThumbnailInput): string[] {
  return (['face-focus', 'text-focus', 'symbol-focus'] as const).map((variantFocus) =>
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

