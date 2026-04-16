# Video analysis for thumbnails — specification (reference)

This document keeps the **product goal**, **current shipped behavior**, **target ideas not yet built**, and **where the code lives**.  
Day-to-day **release scope, checklists, and deferrals** live in [video-analysis-release-roadmap.md](./video-analysis-release-roadmap.md).

---

## 1. Problem statement

Full-length uploads (e.g. hour-long videos) are a poor fit for “send the whole video to a VL model once”:

- Cost and latency scale with provider processing of long `video_url` inputs.
- For a small set of thumbnail variants, returns diminish after bounded context (metadata + short transcript slice + a handful of frames).

**Product principle:** deliver strong thumbnail *ideas* with **bounded** cost and latency, not semantic understanding of every second of the file.

---

## 2. Current implementation (shipped)

| Area | Behavior |
|------|----------|
| **Endpoints** | `POST /api/thumbnails/pipeline/run` (JSON) and `POST /api/thumbnails/pipeline/run-video` (multipart) **enqueue** async jobs; poll `GET /api/thumbnails/pipeline/jobs/:jobId`. Alias: `POST /api/thumbnails/pipeline/jobs` (same body as `pipeline/run`). |
| **Ingest** | File → temporary Supabase upload → signed URL as `video_url`; remote `videoUrl` when used. |
| **Duration** | Gate + `video_context` (Phase 1 metadata) via `VideoPipelineDurationGateService`. |
| **VL** | Prefer **K** JPEG stills (`image_url` data URLs) from **ffmpeg** in a bounded window; else **`video_url`** fallback. Optional YouTube **caption snippet** in text. |
| **Downstream** | Prompt builder → image generation → optional project persistence. |
| **Jobs** | DB table `thumbnail_pipeline_jobs`, in-process runner, lease expiry, capped transient retries. |
| **Client** | YouTube meta enrichment in UI; browser trim helper for uploads (`trim-video-for-thumbnails`) — not server-side trim. |

**Remaining gaps vs stretch goals:** non-YouTube ASR transcript; mid/long coverage sampling beyond first window; stronger perceptual dedup; shared cache (Redis/KV); dedicated worker fleet; richer UX for “no captions”.

---

## 3. Target architecture (north star)

Stages we still treat as **design reference** (not all implemented):

1. Input — URL or upload (done).
2. Cheap metadata — duration, title, channel (partially done).
3. Duration policy — hard max + analyzed window (done for policy; sampling still start-window biased).
4. Transcript — optional, budgeted (YouTube captions MVP done).
5. Frame sampling — bounded window + K frames + cheap filters (done MVP).
6. Pre-filter — dedup/quality (done MVP; not full pHash pipeline).
7. LLM context — compact multimodal package (done MVP).
8. Image generation — separate from VL (done).

Trade-offs and UX expectations (estimated credits, progress states, failure copy) stay as product guidance; operational checks: [pipeline-hardening-runbook.md](./pipeline-hardening-runbook.md).

---

## 4. Related code

- Pipeline: `apps/backend/src/modules/thumbnail-pipeline/` (`thumbnail-pipeline-execution.service.ts`, `thumbnail-pipeline-jobs*.ts`, `thumbnail-pipeline.controller.ts`)
- VL payload: `apps/backend/src/modules/thumbnail-pipeline/services/pipeline-video-understanding.service.ts`, `apps/backend/src/modules/openrouter/multipart-user-content.ts`
- Frames / duration helpers: `apps/backend/src/modules/video-thumbnails/services/video-frame-sample.service.ts`, `video-duration-ffprobe.ts`
- Transcript: `apps/backend/src/modules/video-thumbnails/services/youtube-transcript.service.ts`
- Config: `apps/backend/src/config/video-pipeline.config.ts`

---

## 5. Document history

- **2026-04-16** — Initial long-form phased spec.
- **2026-04-17** — Trimmed: removed duplicate phase-by-phase implementation narrative; ship state and release checklist live in `video-analysis-release-roadmap.md`.
