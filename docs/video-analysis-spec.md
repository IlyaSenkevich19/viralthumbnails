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
| **VL step** | Single OpenRouter chat completion: text + optional **`video_url`** *or* **Phase 2:** up to **K** JPEG stills (`image_url`, data URLs) sampled via **ffmpeg** from the analyzed window when extraction succeeds, else fallback to `video_url` (`PipelineVideoUnderstandingService`, `VideoFrameSampleService`, `multipart-user-content`). |
| **Models** | Configured in `apps/backend/src/config/openrouter-models.ts` (Gemini-class VL for YouTube/video compatibility). |
| **Output** | Structured JSON validated by `ThumbnailPipelineAnalysisSchema` (subject, hooks, `bestThumbnailMoment`, text ideas, image prompt suggestions, etc.). |
| **Downstream** | Prompt builder → image generation → optional persistence. |
| **Client** | YouTube flow may enrich prompt with title/channel; `trim-video-for-thumbnails` exists for **client-side** file trimming — not wired as a server-side analysis pipeline. |

**Gaps vs target:** **transcript extraction**, **dedup/blur filtering**, async worker queue; **frame sampling** for VL is partially implemented (Phase 2 — see §4).

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

### Phase 1 — Metadata + duration — **implemented**

- **Pipeline responses** include optional **`video_context`**: `duration_seconds`, `duration_resolution` (`ffprobe_upload` | `youtube_data_api` | `unavailable`), `max_duration_seconds`, `analyzed_window` (`start_sec`, `end_sec` — full source when duration known; `end_sec` null if unknown).
- **Project persistence:** same object stored under `projects.source_data.video_context` when the run is persisted.
- **`POST /api/thumbnails/get-video-meta`:** `data.duration_seconds` when `YOUTUBE_DATA_API_KEY` is set (Data API `videos.list`).

Types: `apps/backend/src/modules/video-thumbnails/types/video-pipeline-video-context.ts`, `VideoPipelineDurationGateService.resolveContextAndEnforceForPipeline`.

### Phase 2 — Frame sampling + cheap filters (core) — **implemented (MVP)**

- **Config (code):** `VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS`, `VIDEO_PIPELINE_FRAME_SAMPLE_COUNT` in `video-pipeline.config.ts`.
- **Service:** `VideoFrameSampleService` — **ffprobe** duration on HTTPS URL when not already known from `video_context`; **ffmpeg** extracts **K** evenly spaced JPEGs within `min(duration, analyze_window)`; images passed as **data URLs** in `image_url` parts.
- **VL:** `PipelineVideoUnderstandingService` — if sampling returns frames → `userContentTextThenReferenceImages` (frames + template + face order); else **fallback** to `video_url` (e.g. YouTube when ffmpeg cannot decode the URL).
- **Phase 2.1:** cheap pre-filter now enabled in `VideoFrameSampleService` — drop dark/low-contrast frames and near-duplicates from a low-res grayscale signature; if usable frames fall below a minimum threshold, fallback to `video_url`.
- **Phase 2.2:** coverage-aware candidate timestamps (primary + offset pass), blur proxy via grayscale edge energy, and tolerant extraction errors (keep sampling instead of immediate abort).
- **Not yet:** background worker, persistent frame storage, stronger perceptual dedup/blur scoring.

### Phase 3 — Transcript (optional) — **implemented (YouTube MVP)**

- Added `YoutubeTranscriptService`: for YouTube URLs, fetch caption track list (`timedtext?type=list`), pick preferred language (`en`/`ru`/fallback), fetch transcript, normalize, and truncate to budget.
- Orchestrator fetches transcript snippet best-effort and passes it to `PipelineVideoUnderstandingService` as compact text context (`transcriptSnippet`).
- Captions are optional by design: if unavailable/failing, pipeline continues without transcript (no hard failure).
- Explicit UX for “no captions available” is still pending.

### Phase 4 — Polish & scale

- **Implemented (backend, partial):** in-memory TTL cache for sampled frames (`VideoFrameSampleService`) and YouTube transcript snippets (`YoutubeTranscriptService`) to speed repeated runs on the same source/policy.
- **Implemented (async, partial):** DB-backed async jobs for `pipeline/run` with persistent statuses (`queued` → `running` → `succeeded|failed`), polling endpoint, and lease-expiration safety for stuck jobs.
- **Current rollout:** `pipeline/run` is async; `pipeline/run-video` remains sync for now.
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
- Frame sampling (Phase 2): `apps/backend/src/modules/video-thumbnails/services/video-frame-sample.service.ts`, `apps/backend/src/modules/video-thumbnails/utils/video-duration-ffprobe.ts` (`getVideoDurationSecondsFromHttpUrl`)
- Transcript (Phase 3): `apps/backend/src/modules/video-thumbnails/services/youtube-transcript.service.ts`
- Client trim helper (reference only): `apps/frontend/src/lib/video/trim-video-for-thumbnails.ts`

---

## 7. Document history

- **2026-04-16** — Initial spec and phased plan.
- **2026-04-16** — Phase 0 (duration gate) + Phase 1 (`video_context`, get-video-meta duration, `source_data.video_context`).
- **2026-04-16** — Phase 2 (MVP): ffmpeg frame sampling + VL multimodal images path with `video_url` fallback; `video_context` passed into pipeline run input for duration bounds.
- **2026-04-16** — Phase 2.1: cheap frame quality + dedup filters before VL (`VideoFrameSampleService`) with minimum-usable-frame fallback to `video_url`.
- **2026-04-16** — Phase 2.2: blur proxy (`edgeEnergy`) + coverage-aware extra candidate timestamps and tolerant extraction failures.
- **2026-04-16** — Phase 3 (YouTube MVP): optional captions snippet fetched from YouTube timedtext and injected into VL context.
- **2026-04-16** — Phase 4 (partial): in-memory cache for frame sampling/transcript snippets with TTL + max-entry cap.
- **2026-04-16** — Phase 4 (partial): DB-backed async jobs for `pipeline/run` (`POST /thumbnails/pipeline/jobs`, `GET /thumbnails/pipeline/jobs/:jobId`) with runner lease timeout handling.
