---
name: frontend-design
description: Applies ViralThumbnails UI/UX standards for screen layout, hierarchy, responsive behavior, and copy. Use when creating or refining frontend screens, controls, spacing, visual priority, and mobile/desktop adaptations.
---

# Frontend Design (ViralThumbnails)

## Goal

Ship UI that maximizes user confidence in generated thumbnail quality:
- Result-first layout (preview quality is the product value)
- Low visual noise (fewer competing controls)
- Clear, consistent action language
- Modern premium aesthetic with fast perceived performance

## When To Apply

Apply this skill when work touches:
- page layout or responsive breakpoints
- CTA wording and button hierarchy
- filter/pagination/discovery controls
- project detail, create flow, template picker, or sidebar behavior

## Core Rules

1. Prioritize result canvas over controls.
   - On constrained widths, stack settings below or above preview; avoid shrinking preview first.
   - Prefer collapsing secondary chrome (e.g. sidebar) on result-focused screens.

2. Remove duplicate semantics.
   - Never show two controls that mean the same thing (example: `All` + `All templates`).
   - Rename controls to communicate scope (`Any face` vs generic `All templates`).

3. Prefer progressive disclosure over dense control bars.
   - Replace heavy pagination widgets with simpler patterns (`Load more`) unless numeric paging is critical.
   - Keep defaults visible; advanced options should not dominate the viewport.

4. Keep copy consistent across modes.
   - Same user intent -> same CTA text (`Generate thumbnails`).
   - Use action verbs; avoid mixing `Create`/`Generate` for identical outcomes.

5. Preserve interaction stability.
   - Don’t break keyboard/focus behavior while simplifying UI.
   - Keep loading and disabled states explicit (`Loading…`, busy opacity, disabled CTA).

## Modern UI Direction (Default)

Use these defaults unless user asks otherwise:

1. Visual style:
   - Dark premium surfaces, subtle glass layers, soft borders, restrained glow.
   - One primary accent color at a time; avoid rainbow UI.
   - Strong contrast for primary actions and key content.

2. Layout rhythm:
   - Clear spacing scale (`4/8/12/16/24/32`), avoid random gaps.
   - Group controls into 2-3 visual sections max per viewport.
   - Keep one dominant focal block per screen (usually preview/output).

3. Component density:
   - Prefer fewer, larger, readable controls over many tiny ones.
   - Merge duplicate actions; hide secondary actions behind progressive disclosure.
   - Keep labels short and explicit.

4. Motion and feedback:
   - Motion should be quick and calm (`150-250ms`), never flashy by default.
   - Use subtle hover/focus/press states on all interactive controls.
   - Skeletons/placeholders should preserve layout and avoid content jump.

5. Copy tone:
   - Product voice: concise, confident, creator-focused.
   - CTA style: verb + object (`Generate thumbnails`, `Load more`, `Download`).
   - Empty states explain next best action in one sentence.

## Responsive Heuristics

- `xl+`: two-column layout is acceptable if preview remains large.
- `lg/md/sm`: prefer single-column flow to preserve readable preview size.
- If tradeoff exists, reduce control area width before reducing preview area.
- Mobile first for hierarchy: result first, controls second, metadata last.

## Conversion-First Priorities

When there is a trade-off, choose in this order:
1. Show result quality clearly (large preview, clean context)
2. Keep primary action obvious and close to result
3. Reduce decision fatigue (few visible choices)
4. Keep advanced controls available but not noisy

## Screen Recipe (Use As Baseline)

For feature screens like Create / Project Details:
- Header: title + one primary action + lightweight secondary action
- Main area:
  - Block A (hero/result): large, high-contrast, dominant
  - Block B (controls): compact card(s), grouped by task
  - Block C (history/list): horizontal strip or concise list
- Footer area (optional): one primary CTA, one secondary max

## Implementation Checklist

For each UI refactor, verify:
- [ ] Preview area got same or more effective space.
- [ ] No redundant filter/control remains.
- [ ] CTA wording matches existing product language.
- [ ] Reduced visual clutter (fewer borders/rows/widgets competing for attention).
- [ ] Typecheck/lint pass after changes.
- [ ] UI looks visually coherent with premium dark SaaS style.
- [ ] Primary action remains obvious within 2-3 seconds of scan.

## PR/Change Notes Template

Use this short structure in updates:

1. **User-visible change** (what got simpler/bigger/clearer)
2. **Design rationale** (why this improves conversion or confidence)
3. **Responsive impact** (`sm/md/lg/xl` behavior)
4. **Risk/compatibility** (if any state persistence or navigation behavior changed)

## Execution Expectation

When this skill is applied, do not stop at generic advice.
- Propose and implement concrete UI changes in code.
- Prefer polished modern defaults over safe but bland layouts.
- If uncertain between two options, choose the one that improves result visibility and conversion clarity.
