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

/**
 * OpenRouter multimodal requests concatenate a short header + this prompt; keep under provider limits.
 * Must exceed {@link generateOptimizedThumbnailPrompt} typical output (~5–6k) so STRICT / PREVIEW blocks are not truncated.
 */
export const THUMBNAIL_PROMPT_MAX_CHARS_OPENROUTER_MULTIMODAL = 12_000;

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
  compositionTypology: string;
  hook: string;
  layout: string;
  subject: string;
  expression: string;
  background: string;
  color: string;
};

/** Palette & contrast cues appended under STYLE — keep synced with prompting skill. */
export const THUMBNAIL_PALETTE_GUARDRAILS =
  'Prefer saturated complementary accents (warm subject vs cooler background or vice versa). Use at least one clear accent hue; vary luminance so the focal subject separates from backdrop. Reserve black/white/yellow (with thick outline/stroke on text) as high-readability type colors when text appears.';

export const THUMBNAIL_COLOR_ANTI_PATTERNS =
  'Avoid muddy low-contrast pairings; all-pastel or washed palettes; dominant flat gray slabs; monochrome brown-heavy schemes; neon rainbow clutter. Do not emulate a dingy beige office stock photo unless source demands it — keep CTR energy for small previews.';

/**
 * Dense rules inlined under STRICT RULES (single paragraph token budget).
 * Section scaffold carries structure; this string catches edge regressions.
 */
export const ULTIMATE_THUMBNAIL_CHECKLIST_RULES =
  'Max structural clarity: typically one focal subject plus one short text hook zone; avoid cluttered UI or micro-copy. Faces: expressive where present, readable eyes and brows at mobile size. Text only in deliberate negative space, never plastered across face, eyes, mouth, hands, or main hero object. Maintain safe margins and free lower-right for timestamp overlays. Bold sans typography with outline stroke for hook; no watermark or logo hallucinations. Accurate to the video; professional, crisp, high-detail output.';

export const THUMBNAIL_PREVIEW_SELF_CHECK = `
PREVIEW SELF-CHECK (apply mentally before committing to the image):
□ At roughly 120px width, is the focal subject still obvious within 3 seconds?
□ Does the headline (if present) remain readable without squinting?
□ Is facial emotion (if any) clear—not a tiny distant face?
□ Is there adequate contrast between subject, background, and type?
□ Would a viewer grasp the niche or tension without guessing?
□ No deceptive extra claims relative to CREATIVE BRIEF?
`.trim();

const VARIANT_STRATEGIES: Record<ThumbnailPromptVariantFocus, VariantStrategy> = {
  'face-focus': {
    name: 'FACE-FORWARD (portrait CTR)',
    compositionTypology:
      'Face-forward CTR layout: primary face occupies roughly 40–50% of frame height when a person appears; occupy left or upper-left third unless CREATIVE BRIEF contradicts.',
    hook: 'Primary click driver is emotion and readable eyes toward camera when a human subject appears.',
    layout:
      'Rule-of-thirds framing: dominant face on left or upper-left vertical third; headline band on opposite third. Fill the frame with a purposeful crop; allow controlled overlap or edge bleed only if it increases readability. Keep the lower-right quadrant and trailing right edge visually light for faux timestamp UI.',
    subject:
      'Video-accurate person or character focus; derive cues from CREATIVE BRIEF, selected moment, or source context. Prefer natural skin tone and plausible lighting. Tight portrait or commanding medium-close shot so jawline and eyebrows read.',
    expression:
      'Energy matching topic (surprise curiosity confidence concern—only what the source honestly supports): eyebrows and mouth readable when a face appears; deliberate gaze direction. Do not caricature creepiness or plastic unreal skin.',
    background:
      'Supporting environment from topic or blurred frame context behind subject; selectively darken or desaturate side areas so the face pops. Subtle vignette is fine; preserve depth separation.',
    color:
      'Warm key light on face is plausible; push cooler or darker washes on the periphery so contrast survives mobile shrink-test. Align with STYLE palette bullets above.',
  },
  'text-focus': {
    name: 'HEADLINE ZONE (text-led CTR)',
    compositionTypology:
      'Headline-zone layout: reserve about one-quarter to one-third of the frame as a clean negative-space band for very large typography (overall hook still capped at four words maximum).',
    hook: 'Primary click driver is the short benefit, FOMO, or categorical promise embedded in the CREATIVE headline.',
    layout:
      'Place text only on calm gradients or softened plates. Subject is secondary—crop, reposition, or vignette supporting proof without competing glyphs. Preserve rule-of-thirds breathing-room margins.',
    subject:
      'Supporting prop, person, or environment proves the headline while staying peripheral to the typography lockup. Maintain crisp separation between lettering and the busiest subject edges.',
    expression:
      'When a speaker appears, expression stays approachable but typography stays hero. If faceless/object-led, keep staging bold and silhouette-readable instead of relying on facial emotion.',
    background:
      'Simplified gradient cinematic plate or softened environment plate never busy patterned wallpaper behind ultra bold type.',
    color:
      'Saturated contrasting field behind lettering; headline black, white, or yellow slab with a commanding outline complementing field hue.',
  },
  'scene-focus': {
    name: 'SCENE-FORWARD (reveal CTR)',
    compositionTypology:
      'Scene-forward layout: cinematic crop emphasizing action beat prop transformation or juxtaposition headline secondary integrated into safe band.',
    hook: 'Primary click driver is the authentic moment intrigue object contrast or juxtaposition implying incomplete story payoff.',
    layout:
      'Dynamic diagonal or centered mass focus with shallow depth where possible; headline tucks into a stable negative quadrant. Avoid tiny distant silhouettes—they fail the preview test. Same safe lower-right and right-edge margin.',
    subject:
      'Primary story object, gesture, environment, or conflict element exactly faithful to the briefing—scaled large enough for mobile legibility.',
    expression:
      'If humans appear mid-scene, prioritize a readable reaction that matches the beat; otherwise emphasize prop motion, gesture, or lighting tension.',
    background:
      'Context conveys niche but secondary planes fall off into bokeh and tonal separation without fake overlays. Keep clarity—not mud.',
    color:
      'Cinematic contrast and keyed lighting; teal–orange complementary split only if visually motivated.',
  },
};

const COMPLIANCE_CHECKS: readonly PromptCheck[] = [
  { label: 'CREATIVE BRIEF', pattern: /CREATIVE BRIEF/i },
  { label: 'SUBJECT', pattern: /\bSUBJECT\b/i },
  { label: 'EXPRESSION', pattern: /\bEXPRESSION\b/i },
  { label: 'BACKGROUND', pattern: /\bBACKGROUND\b/i },
  { label: 'COMPOSITION', pattern: /\bCOMPOSITION\b/i },
  { label: 'STYLE', pattern: /\bSTYLE\b/i },
  { label: 'TECHNICAL', pattern: /\bTECHNICAL\b/i },
  { label: '1280x720 / 16:9', pattern: /1280\s*[×x]\s*720|16:9/i },
  { label: 'PREVIEW SELF-CHECK', pattern: /PREVIEW SELF-CHECK/i },
  { label: 'palette guardrails presence', pattern: /palette|PALETTE|complementary/i },
  { label: 'anti-pattern language', pattern: /pastel|gray|brown|mud|wash/i },
  { label: 'high contrast cue', pattern: /contrast|saturated/i },
  { label: 'max words hook', pattern: /1.?4\s*words|four words|\bMAX\s*4\b/i },
  { label: 'safe lower|\bright edge', pattern: /lower-right|right edge|timestamp/i },
  { label: 'no logos watermark', pattern: /no logos|watermark/i },
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
Create one production-quality YouTube thumbnail image.

CREATIVE BRIEF
- Video context: ${description}
- Source URL: ${videoUrl}
- Niche / audience cue: ${niche}
- Click promise: ${keyMessage}
- Composition pattern label: ${strategy.name}
- ${strategy.compositionTypology}
- On-image headline ONLY: "${shortText}" (preserve meaning; MAX 4 separate words stacked if needed — do NOT add extra words captions subtitles watermarks badges)
- Variant intent summary: ${strategy.hook}
${viewerCuriosity ? `- Viewer curiosity driver: ${viewerCuriosity}` : ''}
${hookRationale ? `- Why hooks align: ${hookRationale}` : ''}

SUBJECT
- ${strategy.subject}

EXPRESSION
- ${strategy.expression}

BACKGROUND
- ${strategy.background}

COMPOSITION
- ${strategy.layout}
- Maintain visual hierarchy preview-first: curiosity lock point read before detail noise.
- Text placement refinement: ${textPlacement || 'only inside calm negative-space plate NEVER across face eyes mouth dominant object hands logos.'}
- Subject placement refinement: ${subjectPlacement || 'scale primary subject dominant for mobile readability — rule-of thirds aware.'}
${layoutRationale ? `- Planner rationale layering: ${layoutRationale}` : ''}
${doNotCoverRegions?.length ? `- Guard mask DO NOT OCCUPY typography across: ${doNotCoverRegions.join(', ')}` : `- Guard zones: never mask typography over faces eyes mouths hands hero objects lower-right faux timestamp quadrant.`}

STYLE
- Palette & contrast: ${THUMBNAIL_PALETTE_GUARDRAILS}
- Anti-patterns: ${THUMBNAIL_COLOR_ANTI_PATTERNS}
- Color/type execution: ${strategy.color}
- Bold heavy sans-serif headline typography with commanding stroke/outline for hook legibility.

TECHNICAL
- Locked canvas: 1280×720 px; aspect exactly 16:9 export thinking (no cinematic letterbox bars shrinking active image).
- Legibility torture-test: thumbnail must survive shrink to approximate mobile roster scale (~120 px wide conceptual check) without losing silhouette focal read.
- ${ULTIMATE_THUMBNAIL_CHECKLIST_RULES}
- Delivery: single cohesive frame — no collage chrome device bezel mock explanatory caption outside image plane.

STRICT RULES — ACCURACY & INTEGRITY
- Stay faithful truthful to briefing—spark curiosity NEVER fraudulent promises absent from CREATIVE context.
- Do NOT fabricate sensational conflict romance illegal claims wealth figures versus drama unmentioned by source briefing.
- If frame reference includes human keep face unobstructed by typography reposition words not crop away emotional read.
- Reject injecting fake annotation overlays (arrows red circles dots targets sparks) unless user explicitly instructed.
- Reject cluttered UI, microscopic multi-line paragraphs, logo soup, emoji spam, low-effort meme vibes, or heavy compression artifacts.

${THUMBNAIL_PREVIEW_SELF_CHECK}
${style ? `\nSUPPLEMENTARY STYLE NOTES\n${style}` : ''}
${avoid?.length ? `\nNEGATIVE PROMPT PATCHES\n- ${avoid.join('\n- ')}` : ''}

Output ONLY the image — no explanatory prose before or after.
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
