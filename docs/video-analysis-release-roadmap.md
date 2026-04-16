# Video Analysis Release Roadmap (MVP -> Release)

This document fixes the final scope for release of the optimized video-analysis thumbnail pipeline.

## 1) Current state (implemented)

- Duration gate + `video_context` policy metadata.
- Frame-based VL input with fallback to `video_url`.
- Cheap frame quality filters (dedup/brightness/contrast/edge proxy).
- YouTube transcript snippet (best-effort, truncated).
- Async jobs for `POST /api/thumbnails/pipeline/run` and `POST /api/thumbnails/pipeline/run-video` with polling (`GET /thumbnails/pipeline/jobs/:jobId`).
- In-memory TTL caches for sampled frames and transcript snippets.

## 2) Release goal

Ship a stable, cost-predictable pipeline with clear UX status and no sync-heavy bottlenecks.

## 3) In-scope before release (must do)

### A. Stability and throughput

1. Move `POST /api/thumbnails/pipeline/run-video` to async jobs (same queue model as `pipeline/run`).
2. Keep one execution path through `ThumbnailPipelineExecutionService`.
3. Preserve current output contract for completed runs.

### B. Safe retry policy

1. Add retry only for clearly transient failures (network timeout/reset, provider `429/5xx`).
2. Start with `MAX_RETRIES = 1`.
3. No retry for validation/content/schema deterministic errors.
4. User credits must remain fixed per run (retry must not increase user credit charge).

### C. Minimal observability

Log enough to compute:

- job success/fail rate,
- average job duration,
- frame fallback rate (`frames -> video_url`),
- retry count/reason.

### D. Minimal UX status

Expose and display async statuses (`Queued`, `Processing`, `Done`, `Failed`) for both run modes.

## 4) Out of scope for this release (defer)

### 4.1 Redis/shared distributed cache

Deferred intentionally.

Reason:

- current in-memory cache is enough for MVP scale,
- Redis adds operational complexity and cost before we confirm necessity from metrics.

### 4.2 Advanced two-pass moment mining

Deferred intentionally.

What it is:

- first pass finds likely highlight moments semantically,
- second pass re-samples around those moments and re-ranks context.

Why not now:

- larger algorithmic surface and quality-tuning cycle,
- not required to stabilize reliability/cost for initial release,
- current uniform+quality-filter sampling already gives usable outputs.

### 4.3 Complex ranking/dedup of generated outputs

Deferred intentionally.

What it is:

- semantic similarity clustering of final variants,
- quality reranking before persistence/response.

Why not now:

- extra generation-time complexity and additional model/image scoring costs,
- not a blocker for core reliability and async rollout,
- can be added as post-release quality iteration.

## 5) Release acceptance checklist

- [x] `pipeline/run` and `pipeline/run-video` are both async with polling.
- [x] retry policy is enabled only for transient failures and capped (`MAX_RETRIES = 1` in `ThumbnailPipelineJobsRunnerService`).
- [x] no extra user credit charging due to retries (each attempt is a full `orchestrator.run` with its own `run_id`; a failed attempt refunds in `ThumbnailPipelineOrchestratorService`; only a successful completion keeps the charge).
- [x] baseline metrics above are visible in logs (job success/fail + `queuedMs`/`execMs`/`attempts` in runner; `vl_input_mode` in `PipelineVideoUnderstandingService`).
- [x] UI shows async status clearly in both flows (New project: text + video tabs use `jobStatusLabel` on the submit button).
- [ ] regression pass done for text/script/youtube/video modes (manual QA sign-off).

## 6) Post-release priority (first)

1. Measure real fallback and failure rates for 1-2 weeks.
2. Decide whether shared cache (Redis) is needed from data.
3. If quality is the main complaint, prioritize moment-aware second pass.

