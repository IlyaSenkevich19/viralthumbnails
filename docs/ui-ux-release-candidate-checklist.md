# UI/UX Release Candidate Checklist

Use this checklist before shipping frontend changes.

Rules:
- Mark each item as `PASS` or `FAIL`.
- A screen is release-ready only when all **Critical** items pass.
- For any `FAIL`, add a short note with screenshot/video reference.

---

## 1) Global Visual System

### Critical
- [ ] `PASS/FAIL` Color tokens look consistent across `background`, `card`, `sidebar`, `muted`, `border`.
- [ ] `PASS/FAIL` Primary accent color is used intentionally (CTA and key highlights only).
- [ ] `PASS/FAIL` Text contrast is readable for body and muted text on all primary surfaces.
- [ ] `PASS/FAIL` No obvious visual noise from competing badges/glows/shadows on one viewport.

### Quality
- [ ] `PASS/FAIL` Radius, spacing, and border thickness feel consistent between cards and controls.
- [ ] `PASS/FAIL` Hover/focus/active states are present and subtle (not distracting).

---

## 2) Header + Navigation

### Critical
- [ ] `PASS/FAIL` Sidebar nav labels match reality (no outdated `Soon` markers on live pages).
- [ ] `PASS/FAIL` Header controls remain usable on small widths (no clipping/overlap).
- [ ] `PASS/FAIL` Current route is clearly visible in sidebar active state.

### Quality
- [ ] `PASS/FAIL` Mobile menu open/close state is clear and prevents background interaction.
- [ ] `PASS/FAIL` Credits indicator and status messages do not dominate page hierarchy.

---

## 3) Create Page (`/create`)

### Critical
- [ ] `PASS/FAIL` Main CTA wording is consistent and clear (`Generate thumbnails`).
- [ ] `PASS/FAIL` Mode switching (Prompt / YouTube / Video) is obvious and stable.
- [ ] `PASS/FAIL` Form controls have clear labels and error states.
- [ ] `PASS/FAIL` Busy/loading states are visible and prevent duplicate submissions.

### Quality
- [ ] `PASS/FAIL` Empty/default state guides user in one sentence.
- [ ] `PASS/FAIL` No redundant controls competing with primary action.

---

## 4) Projects List (`/projects`)

### Critical
- [ ] `PASS/FAIL` Row/card scan is fast: title, status, updated time readable within 2-3 seconds.
- [ ] `PASS/FAIL` Click targets are unambiguous (open project vs row menu actions).
- [ ] `PASS/FAIL` Empty state provides a clear next action.

### Quality
- [ ] `PASS/FAIL` Desktop table and mobile cards present equivalent key info.
- [ ] `PASS/FAIL` Preview thumbnails have meaningful alt text.

---

## 5) Project Details / Variants (`/projects/:id/variants`)

### Critical
- [ ] `PASS/FAIL` Result preview has visual priority over control panels.
- [ ] `PASS/FAIL` On `lg/md/sm`, layout does not shrink preview excessively.
- [ ] `PASS/FAIL` Template picker controls are understandable (no duplicate semantics).
- [ ] `PASS/FAIL` Template cards are accessible (`aria-label` / readable names).
- [ ] `PASS/FAIL` No fake-functional primary controls (coming-soon items are clearly demoted).

### Quality
- [ ] `PASS/FAIL` Variants strip is easy to scan and select.
- [ ] `PASS/FAIL` Credit cost messaging near generate action is clear.

---

## 6) Templates (`/templates`)

### Critical
- [ ] `PASS/FAIL` Loading state uses visible skeleton/fallback (no blank screen).
- [ ] `PASS/FAIL` Empty state is user-first (not developer-jargon-first).
- [ ] `PASS/FAIL` Template images have meaningful alt text.

### Quality
- [ ] `PASS/FAIL` Filtering and pagination controls avoid unnecessary complexity.

---

## 7) Avatars (`/avatars`)

### Critical
- [ ] `PASS/FAIL` Add/delete flows are obvious and reversible where expected (confirmation on delete).
- [ ] `PASS/FAIL` Avatar image cards have meaningful alt text.
- [ ] `PASS/FAIL` Upload errors are actionable (format/type guidance).

---

## 8) Settings (`/settings`)

### Critical
- [ ] `PASS/FAIL` Page naming and section naming align with actual content (diagnostics vs user settings).
- [ ] `PASS/FAIL` Critical system checks are readable and status is obvious.

### Quality
- [ ] `PASS/FAIL` Technical data is grouped and not overwhelming for non-technical users.

---

## 9) Credits (`/credits`)

### Critical
- [ ] `PASS/FAIL` Most useful information appears first (`Your balance`).
- [ ] `PASS/FAIL` If checkout is disabled, messaging is explicit and non-confusing.
- [ ] `PASS/FAIL` Pricing cards clearly communicate availability (`Coming soon`).

### Quality
- [ ] `PASS/FAIL` Ledger table remains readable on smaller screens.

---

## 10) Auth (`/auth` screens)

### Critical
- [ ] `PASS/FAIL` Sign-in and Sign-up hierarchy is clear; no irrelevant promo badges.
- [ ] `PASS/FAIL` Register wizard progression gives user control (explicit continue/back).
- [ ] `PASS/FAIL` Error messages are specific and visible near relevant inputs.

---

## 11) Accessibility + Interaction QA (Whole App)

### Critical
- [ ] `PASS/FAIL` Full keyboard navigation works on core flows (Create, Projects, Variants, Auth).
- [ ] `PASS/FAIL` Focus states are always visible.
- [ ] `PASS/FAIL` All icon-only buttons have `aria-label`.
- [ ] `PASS/FAIL` Interactive image cards have accessible names.

### Quality
- [ ] `PASS/FAIL` `prefers-reduced-motion` behavior remains acceptable.

---

## 12) Responsive Matrix (Required Devices)

Run the same core checks at:
- Mobile: `360x800`, `390x844`
- Tablet: `768x1024`
- Small laptop: `1366x768`
- Desktop: `1440x900` (or wider)

### Critical
- [ ] `PASS/FAIL` No clipping/overlap in header, CTA rows, modal actions.
- [ ] `PASS/FAIL` No horizontal scroll on primary content areas.
- [ ] `PASS/FAIL` Primary CTA remains visible without hunting.

---

## Release Decision

- [ ] `PASS/FAIL` All **Critical** items pass.
- [ ] `PASS/FAIL` Remaining `FAIL` items (quality-only) are documented and accepted.
- [ ] `PASS/FAIL` Screenshots for final pass are stored in release notes / QA doc.

