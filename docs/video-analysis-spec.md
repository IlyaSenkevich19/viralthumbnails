# Video analysis for thumbnails — product & technical specification

This document describes the **target architecture** for cost-efficient, predictable video-backed thumbnail ideation, what **already exists** in ViralThumbnails today, and a **phased implementation** plan.

---

## 1. Problem statement

Full-length uploads (e.g. hour-long videos) are a poor fit for “send the whole video to a VL model once”:

- Cost and latency scale with provider processing of long `video_url` inputs.
- For **three thumbnail variants**, diminishing returns appear after a small amount of structured context (metadata + short transcript slice + a handful of frames).

**Product principle:** deliver strong thumbnail *ideas* with a **bounded** cost and latency, not semantic understanding of every second of the file.

---

## 2. Current implementation (as of this doc)

| Area | Behavior |
|------|----------|
| **Endpoints** | `POST /api/thumbnails/pipeline/run` (JSON with optional `video_url`), `POST /api/thumbnails/pipeline/run-video` (multipart file or `videoUrl`). |
| **Ingest** | File → temporary Supabase upload → signed URL passed as `video_url`; YouTube/public URL passed through when valid. |
| **VL step** | Single OpenRouter chat completion: user message = text + optional `video_url` part + optional reference images (`PipelineVideoUnderstandingService`, `multipart-user-content`). |
| **Models** | Configured in `apps/backend/src/config/openrouter-models.ts` (Gemini-class VL for YouTube/video compatibility). |
| **Output** | Structured JSON validated by `ThumbnailPipelineAnalysisSchema` (subject, hooks, `bestThumbnailMoment`, text ideas, image prompt suggestions, etc.). |
| **Downstream** | Prompt builder → image generation → optional persistence. |
| **Client** | YouTube flow may enrich prompt with title/channel; `trim-video-for-thumbnails` exists for **client-side** file trimming — not wired as a server-side analysis pipeline. |

**Gaps vs target:** no server-side **duration policy**, **transcript extraction**, **frame sampling**, **dedup/blur filtering**, or **compact multimodal bundle** (many images + short text) as a replacement for raw long `video_url` to the LLM.

---

## 3. Target architecture

### 3.1 Processing stages

1. **Input** — YouTube URL or uploaded file (keep existing ingest).
2. **Cheap metadata** — duration, title, channel where available (`ffprobe` / oEmbed / Data API policy as chosen).
3. **Duration policy** — enforce max analyzed wall-clock time (e.g. first N minutes + optional mid/end samples for long videos).
4. **Transcript (optional)** — if captions exist, fetch and **truncate/summarize** to a token budget; if not, skip or mark “no transcript” in context.
5. **Frame sampling** — decode only allowed time windows; sample K timestamps (uniform + optional heuristic “peaks”).
6. **Pre-filter (cheap)** — dedup (perceptual hash), drop dark/blurry frames (simple metrics), optional face/contrast scoring if ROI justifies it.
7. **LLM context** — send **compact** package: structured text + **limited** `image_url` parts (data URLs or short-lived HTTPS) + instructions for JSON output matching (or extending) `ThumbnailPipelineAnalysis`.
8. **Image generation** — unchanged conceptually: separate calls from refined prompts.

### 3.2 Frame selection rules (baseline policy)

- **Hard cap:** max **M** frames per request (e.g. 8–12), independent of source duration.
- **Coverage:** uniform slots across the **allowed** window; add 1–2 slots for mid/end on long videos.
- **Dedup:** merge adjacent near-identical frames.
- **Quality gate:** drop frames below brightness/contrast thresholds; optional motion-blur proxy via frame differencing.
- **Faces:** optional boost for thumbnails that need a presenter — not mandatory for all niches.

### 3.3 Why this is economical

- LLM / VL billing is driven by **what you send**; bounded images + summarized text beats full-length native video for many providers.
- Local steps (hash, resize, simple metrics) are negligible vs API cost.
- Predictable **upper bound** per run improves pricing and capacity planning.

### 3.4 API load & abuse mitigation

- Keep and tighten **rate limits** on pipeline routes (existing throttles).
- **Async jobs** for heavy decode/sample: HTTP returns `202` + job id or use existing mutation UX with polling (product decision).
- **Max file size / max analyzed duration** documented in UI before run.
- **Caching** keyed by `(source id, pipeline version, policy hash)` for metadata/sampled frames where safe.

### 3.5 User experience

- Upfront: **estimated credits / wait**, and plain language: “We analyze up to X minutes / Y frames.”
- Progress states: e.g. *Preparing → Sampling → Analyzing → Generating*.
- Failure modes: provider errors with actionable copy (aligned with `OpenRouterApiError` handling).

### 3.6 Trade-offs

| Benefit | Cost |
|--------|------|
| Stable cost & latency | More infra: workers, ffmpeg, storage for frames |
| Better control of LLM input | May miss a rare “golden” moment unless sampling strategy is tuned |
| Clear user expectations | Product rules needed for “no captions” / low-quality uploads |

---

## 4. Suggested implementation phases

Order is intentional: each phase delivers value or de-risks the next.

### Phase 0 — Instrument & bound (small, high leverage) — **implemented**

- **Config:** max duration is **`VIDEO_PIPELINE_MAX_DURATION_SECONDS`** in `video-pipeline.config.ts` (code constant). Optional env **`YOUTUBE_DATA_API_KEY`** for YouTube duration via Data API v3.
- **Enforcement (server):** before pipeline runs with video — **uploaded file:** duration via **`ffprobe`** on the buffer when available; **YouTube watch URL:** duration via **`videos.list`** when API key is set. Other `https` URLs: gate skipped (logged).
- **Reject:** `400` with `code: VIDEO_EXCEEDS_MAX_DURATION` when known duration > max.
- **Outcome:** long YouTube/uploads are blocked when duration is known; otherwise a **warn** is logged (no API key / ffprobe missing / non-YouTube URL).

See `VideoPipelineDurationGateService`, `video-pipeline.config.ts`, `apps/backend/src/modules/thumbnail-pipeline/thumbnail-pipeline.controller.ts`.

### Phase 1 — Metadata + duration gate only

- Server-side **duration** for uploaded files (e.g. ffprobe in worker or lightweight binary).
- YouTube: duration from existing meta path or minimal API usage (respect quotas/TOS).
- Persist “analyzed window” in run metadata for support/debug.

### Phase 2 — Frame sampling + cheap filters (core)

- Worker pipeline: **decode window** → extract **K** frames → dedup + quality filter → encode JPEG.
- Replace or **fallback** alongside raw `video_url` to VL: send **images + text** instead of full video when policy says so.
- **Outcome:** major cost control; quality iteration loop on K and window strategy.

### Phase 3 — Transcript (optional)

- YouTube captions when available; truncate to budget; inject into prompt.
- Explicit UX when captions are missing.

### Phase 4 — Polish & scale

- Caching, async queue UI, face/contrast heuristics if metrics show lift.
- Tune sampling for vertical/long-form niches.

---

## 5. Where to start (recommended)

**Start with Phase 0 + Phase 1:**

1. **Phase 0** is a few lines of policy + logging and immediately reduces risk of “hour-long accidental analyze.”
2. **Phase 1** gives **truthful duration** on the server for uploads and aligns YouTube metadata — required before any honest “we analyze X minutes” copy.

**Then Phase 2** — this is the main engineering milestone (worker + ffmpeg + storage + changing the VL payload shape).

Transcripts (Phase 3) can parallelize after Phase 1 if captions are a product priority; otherwise defer until frame path is stable.

---

## 6. Related code (for implementers)

- Pipeline orchestration: `apps/backend/src/modules/thumbnail-pipeline/`
- VL messages: `apps/backend/src/modules/openrouter/multipart-user-content.ts`
- Analysis schema: `apps/backend/src/modules/thumbnail-pipeline/schemas/thumbnail-pipeline-analysis.schema.ts`
- Video ingest: `apps/backend/src/modules/video-thumbnails/services/video-ingestion.service.ts`
- Client trim helper (reference only): `apps/frontend/src/lib/video/trim-video-for-thumbnails.ts`

---

## 7. Document history

- **2026-04-16** — Initial spec and phased plan.
