# Video Analysis Release Roadmap (MVP -> Release)

This document is the **single place** for release scope, what is already shipped, what is deferred, and the acceptance checklist.

---

## 1) Shipped (baseline)

- Duration gate + `video_context` policy metadata.
- Frame-based VL input with fallback to `video_url`.
- Cheap frame quality filters (dedup / brightness / contrast / edge proxy).
- YouTube transcript snippet (best-effort, truncated).
- Async jobs for `POST /api/thumbnails/pipeline/run` and `POST /api/thumbnails/pipeline/run-video` with polling (`GET /api/thumbnails/pipeline/jobs/:jobId`).
- In-memory TTL caches for sampled frames and transcript snippets.
- Capped transient job retries (`ThumbnailPipelineJobsRunnerService`); failed attempts refund credits in `ThumbnailPipelineOrchestratorService` so users are not double-charged for a single successful outcome.

---

## 2) Release goal

Stable, cost-predictable pipeline with clear async UX and no sync-heavy bottlenecks.

---

## 3) Release track — completed milestones

The following were the pre-release “must do” items; they are **done in code**:

- Async `pipeline/run` + `pipeline/run-video` + polling.
- One execution path via `ThumbnailPipelineExecutionService`.
- Safe retry (transient-only, cap 1).
- Minimal logs: job timing / attempts / retry reason; `vl_input_mode` in VL service.
- UI: `jobStatusLabel` on New project (text + video flows).

---

## 4) Out of scope for this release (defer)

### 4.1 Redis / shared distributed cache

Deferred: in-memory cache is enough until metrics justify Redis/KV and ops cost.

### 4.2 Advanced two-pass moment mining

Deferred: larger tuning surface; current uniform + quality-filter sampling is acceptable for v1.

### 4.3 Complex ranking / dedup of generated outputs

Deferred: extra cost and complexity; post-release quality iteration.

---

## 5) Release acceptance checklist

- [x] `pipeline/run` and `pipeline/run-video` are both async with polling.
- [x] Retry policy: transient-only, capped.
- [x] No extra user credit charging for retries (failed attempt refunds; success keeps one charge).
- [x] Baseline metrics in logs (job runner + `vl_input_mode`).
- [x] UI async status (New project).
- [ ] Manual regression: text / script / youtube / video modes (sign-off).

---

## 6) Post-release (first)

1. Measure fallback and failure rates from logs.
2. Revisit shared cache if multi-instance or repeat traffic demands it.
3. If quality is the bottleneck, add moment-aware second pass and/or mid/end window sampling.
