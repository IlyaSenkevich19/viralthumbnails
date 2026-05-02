---
name: youtube-thumbnail-prompting
description: Builds high-CTR YouTube thumbnail prompts for ViralThumbnails using a fixed Subject→Expression→Background→Composition→Style→Technical scaffold, layout typologies, contrast and palette guardrails, and small-preview quality checks. Use when editing backend prompt builders, variant image prompts, pipeline analysis output, or product copy about thumbnail generation rules.
---

# YouTube thumbnail prompting (ViralThumbnails)

## Goal

Keep image-model prompts **stable, scannable, and CTR-oriented** by always using the same section order and vocabulary. Implementation lives in `apps/backend/src/common/optimized-thumbnail-prompt.ts` and `pipeline-prompt-builder.service.ts`.

## Required prompt scaffold (in this order)

1. **CREATIVE BRIEF** — video/topic context, niche, click promise, exact short on-image headline (1–4 words), variant intent.
2. **SUBJECT** — what dominates the frame; ties to source/template/frame when references exist.
3. **EXPRESSION** — face/body energy when a person appears; must read on a phone-sized tile.
4. **BACKGROUND** — supports subject; separation via blur, gradient, or selective lighting (not flat mush).
5. **COMPOSITION** — named layout typology + rule-of-thirds, safe zones, text vs subject separation.
6. **STYLE** — color treatment, typography class (bold sans, outline), palette hints and **anti-patterns** (pastel-only, gray slab, washed pairs).
7. **TECHNICAL** — **1280×720, 16:9**, legibility at ~120 px wide preview, watermark/logo ban, hook-only text rule.
8. **STRICT RULES** — accuracy, no fake annotations, timestamp-safe lower-right margin.
9. **PREVIEW SELF-CHECK** — bullet checklist the model applies before “finalizing” the image mentally.

Never rename these section headers in code without updating `validatePrompt` patterns in `optimized-thumbnail-prompt.ts`.

## Layout typologies (product vocabulary)

Map internal `variantFocus` / rotation to user-facing language:

| Typology | When | Composition notes |
|----------|------|-------------------|
| **Face-forward** | `face-focus` | Face ~**40–50%** of frame when a person appears; **opposite third** reserved for headline negative space; strong eyes/mouth read. |
| **Headline zone** | `text-focus` | **~⅓ frame** clean band for 1–4 words; subject proves the claim without sitting under text. |
| **Scene-forward** | `scene-focus` | Dramatic crop of real beat/object; headline secondary; cinematic contrast not fake overlays. |
| **Split reveal** *(optional seed text)* | Before/after, VS | Explicit **left/right** treatment, lighting shift; only if source supports transformation — no fabricated drama. |

## Global creative rules

- **One focal subject** plus **one** short headline unless faceless/layout-only; avoid UI clutter and micro-text.
- **High contrast** for mobile; complementary or split accents beat monochrome gray or all-pastel.
- **No** extra words, watermarks, logos, emojis, fake arrows/circles unless user explicitly requests.
- **Lower-right** and **right edge**: keep free of critical text (timestamp UI safe zone).
- **Accurate to source**: curiosity without deceptive clickbait; do not invent money fights, romance, etc.

## Second-pass / QA usage

- Run prompts through `validatePrompt()` in `optimized-thumbnail-prompt.ts` in tests or CI when changing templates.
- For agent refactors: after editing the template, ensure **every** section still appears and compliance regexes pass on a sample prompt.

## Files to touch

- `apps/backend/src/common/optimized-thumbnail-prompt.ts` — canonical template and strategies.
- `apps/backend/src/modules/thumbnail-pipeline/services/pipeline-prompt-builder.service.ts` — passes analysis into `generateOptimizedThumbnailPrompt`.
- `apps/backend/src/common/thumbnail-prompt-guidelines.ts` — style presets and short guardrails (avoid duplicating the full scaffold here).
- `pipeline-thumbnail-generation.service.ts` / `project-variant-image.service.ts` — multimodal OpenRouter requests must not truncate the optimized prompt below actual length; cap is `THUMBNAIL_PROMPT_MAX_CHARS_OPENROUTER_MULTIMODAL` (see `optimized-thumbnail-prompt.ts`).
