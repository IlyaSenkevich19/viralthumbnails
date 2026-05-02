---
name: design-taste-frontend
description: Senior UI/UX engineering for React/Next.js with bias-corrected polish—metric-driven layout/motion/density dials, strict component boundaries, Tailwind/version guards, GPU-safe motion, and anti-slop patterns. Use when building or refining frontend UI, dashboards, landing pages, motion-heavy components, or when the user wants premium non-generic interfaces.
---

# High-Agency Frontend (Design Taste)

## 1. Active baseline configuration

- **DESIGN_VARIANCE:** 8 (1 = perfect symmetry, 10 = artsy chaos)
- **MOTION_INTENSITY:** 6 (1 = static, 10 = cinematic)
- **VISUAL_DENSITY:** 4 (1 = airy gallery, 10 = cockpit)

**AI instruction:** Treat these triplets as strict global defaults. Do **not** ask the user to edit this file. When the user explicitly overrides any dial in chat, adopt their values immediately for Sections 3–7.

---

## 2. Default architecture and conventions

Unless the stack is specified differently:

### Dependency verification (mandatory)

Before importing **any** third-party package (`framer-motion`, `zustand`, icon libs, etc.), read `package.json`. If absent, output the exact install command (e.g. `npm install package-name`) **before** code. Never assume a dependency exists.

### Framework and interactivity

- Prefer **React** or **Next.js**. Default **Server Components (RSC)**.
- **RSC safety:** global state belongs only in **Client** components; in Next.js, wrap providers in a `"use client"` boundary.
- **Interactivity isolation:** When Sections 4 or 7 (motion, liquid glass) apply, extract the interactive surface into an **isolated leaf** Client component with `'use client'` at the **top**. RSC parents render **static layout only**.

### State

- Prefer `useState` / `useReducer` for local UI.
- Use global store **only** to avoid unjustified deep prop drilling.

### Styling policy

- **Tailwind ~90%.**
- **Version lock:** read `package.json` first; **never** mix v4-only syntax into a v3 project.
- **Tailwind v4 config guard:** for v4, do **not** use the legacy `tailwindcss` PostCSS plugin; use `@tailwindcss/postcss` or the Vite plugin per project setup.

### Anti-emoji policy (critical)

Never use emoji in **code**, **markup**, **visible copy**, or **alt text**. Use Radix Icons, Phosphor, or purposeful SVG primitives.

### Responsiveness and spacing

- Normalize on `sm` / `md` / `lg` / `xl`.
- Page shells: `max-w-[1400px] mx-auto` or `max-w-7xl`.
- **Viewport stability (critical):** never use `h-screen` for full-height heroes; use **`min-h-[100dvh]`** (mobile Safari).
- **Grid over flex math:** forbid fragile `calc()` width hacks in flex; prefer `grid grid-cols-1 md:grid-cols-* gap-*`.

### Icons

- Imports must resolve to **`@phosphor-icons/react`** **or** **`@radix-ui/react-icons`** depending on what is installed. Standardize `strokeWidth` (e.g. always `1.5` or always `2.0`) project-wide.

---

## 3. Design engineering (bias correction)

**Rule 1 — Typography**

- Display / headlines baseline: `text-4xl md:text-6xl tracking-tighter leading-none` unless user context demands otherwise.
- **Anti-slop:** avoid **Inter** for premium / creative; prefer **Geist**, **Outfit**, **Cabinet Grotesk**, or **Satoshi**.
- **Dashboard / SaaS:** **no serifs.** Pair high-end sans with mono (**Geist + Geist Mono**, **Satoshi + JetBrains Mono**).
- Body: `text-base text-gray-600 leading-relaxed max-w-[65ch]` (adapt neutrals if dark-first).

**Rule 2 — Color**

- Max **one** accent; keep saturation `< 80%`.
- **LILA ban:** forbid default “AI purple / blue neon” clichés—no glowing purple gradients. Base on **slate/zinc neutrals**; one crisp accent (**emerald**, **electric blue**, **deep rose**, etc.—not violet-by-default).
- **Consistency:** avoid mixing warm-gray and cool-gray in the same composition.

**Rule 3 — Layout diversification**

When **DESIGN_VARIANCE > 4**, **ban** textbook centered hero typography columns. Prefer split screens, asymmetric bands, intentional negative space.

**Rule 4 — Materiality (anti-card overuse)**

- When **VISUAL_DENSITY > 7**, avoid generic bordered cards everywhere; segment with **`border-t`**, **`divide-y`**, or whitespace; metrics should breathe unless elevation encodes hierarchy.
- Use **shadow tinted to backdrop**, not halo glow spam.

**Rule 5 — Interaction states**

Generate full lifecycle:

- Skeletons that mirror layout (avoid lone spinners unless tiny inline).
- Composed empty states with a clear path forward.
- Inline form errors beneath fields.
- Tactile press: `-translate-y-px` or `scale-[0.98]` on `:active`.

**Rule 6 — Forms**

Labels **above** inputs; helpers optional; errors below; **`gap-2`** within each field cluster.

---

## 4. Creative proactivity

- **Liquid glass:** besides `backdrop-blur`, use `border border-white/10` and inset highlight: `shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`.
- **Magnetic micro-physics (MOTION_INTENSITY > 5):** **never** drive continuous pointer tracking with **`useState`**. Use **`useMotionValue`** + **`useTransform`** only.
- **Perpetual micro-interactions (MOTION_INTENSITY > 5):** subtle infinite loops (**pulse**, **float**, **shimmer**, marquee, etc.). Springs: **`{ type: "spring", stiffness: 100, damping: 20 }`** instead of linear easing soup.
- **Layout transitions:** use Framer **`layout`** / **`layoutId`** whenever layout identity should persist visually.
- **Stagger orchestration:** `staggerChildren` or cascaded `--index` delays. Parent **`variants`** and motion children stay in the **same Client subtree**; fetched data enters through a centralized motion parent wrapper.

---

## 5. Performance guardrails

- Grain / noise overlays: **fixed** layers, **`pointer-events-none`**, never on scrolling surfaces.
- **Hardware acceleration:** animate **`transform`** + **`opacity`** only—not `top/left/width/height`.
- **Z-index:** reserve for systemic layers (nav shells, dialogs, overlays), not cosmetic stacking.

---

## 6. Dial reference (DETAIL vs DEFAULT)

Interpret **baseline (8 / 6 / 4)** with these ladders:

### DESIGN_VARIANCE (1–10)

- **1–3:** symmetrical grids and centered flows allowed.
- **4–7:** overlaps, uneven ratios allowed on desktop (`md:`+).
- **8–10:** masonry / asymmetric fractional grids (`2fr 1fr 1fr`), dramatic whitespace choreography.
- **Mobile override (<768px):** aggressive single-column **`w-full`**, sane gutters (`px-4`, `py-8`), zero horizontal bleed.

### MOTION_INTENSITY (1–10)

- **1–3:** hover / active transitions only—no looping loops.
- **4–7:** CSS transitions emphasizing transform/opacity; gentle delays.
- **8–10:** complex choreography permitted (Framer, scroll-linked patterns) but **avoid** naive `window` scroll spam; prefer primitives / observers / motion libs per project tooling.

### VISUAL_DENSITY (1–10)

- **1–3:** extra whitespace between sections (“gallery mode”).
- **4–7:** balanced web-app spacing (current default anchors here).
- **8–10:** cockpit mode—minimal padding; ** monospace numbers** mandatory; separators over cards.

---

## 7. AI tells (forbidden defaults)

Avoid unless explicitly requested:

| Area | Forbidden |
| --- | --- |
| Visual | Neon outer glow shadows, `#000`, oversaturated gradients on giant titles, flashy text-fill gradients everywhere, custom CSS cursors |
| Type | Default Inter vibes, serif dashboards, giant screaming H1 hierarchy |
| Layout | Sloppy asymmetric gaps at md+, generic **three equal promo cards**, centered-everything when variance > 4 |
| Content | “Jane/John Doe”, fake `99.99%`, symmetrical fake phone numbers, “Acme / Nexus”, filler verbs (“elevate”, “unleash”, “seamless”) |
| Imagery | Unsplash placeholders; broken URLs Use **`picsum.photos/seed/<string>/WxH`** or curated SVG/UI avatars |
| shadcn | Never ship raw defaults—radii palette shadows must harmonize |

**External motion stacks**

- Prefer **Framer Motion** for UI choreography.
- **GSAP**, **Three.js / WebGL** only for isolated **scroll stories** / **canvas** layers with strict effect cleanup—and **never** mix GSAP/Three with Framer in the **same component tree**.
- Wrap heavy canvases/`useEffect` drivers with teardown logic.

Advanced pattern catalog (“Creative Arsenal”), navigation experiments, mega menus, kinetic typography cheatsheet → **`creative-arsenal.md`**.

---

## 8. Motion-engine Bento paradigm (modern SaaS)

When building dense feature grids / dashboards leaning “Vercel-core × Dribbble-clean”:

- **Backdrop:** `#f9fafb` with white tiles `#ffffff`.
- **Tile chrome:** subtle `rounded-[2.5rem]`, **`border border-slate-200/50`**, diffuse shadow `shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]`.
- **Fonts:** Geist | Satoshi | Cabinet Grotesk with `tracking-tight` headers.
- **Labels live outside tiles** (captions underneath) whenever story-telling—not trapped inside cramped glass boxes.
- **Padding:** lavish inner padding (`p-8`/`p-10`).
- Each tile runs a **distinct perpetual interaction** (**auto-sort lists with `layoutId`**, faux command bar loops, carousel metrics, contextual focus highlights, etc.).
- Isolate infinite loops behind **`memo`** boundaries in micro Client shells so parents stay cheap.

Implement the archetypical five motifs when scaffolding bento grids (intelligent reorder list, typewriter AI bar + shimmer, breathe status pulses + badge springs, marquee metrics rail, contextual focus reader).

---

## 9. Pre-flight matrix

Ship only after mentally checking:

1. Prop drilling vs purposeful global adoption.
2. Mobile collapse for asymmetric designs.
3. `min-h-[100dvh]` replaces `h-screen` on heroes.
4. Effectful animations include cleanup/dispose paths.
5. Loading / empty / error states exist wherever async UI appears.
6. Cards justify their existence (density / hierarchy cues).
7. CPU-heavy perpetual motion fenced into tiny Client capsules.
