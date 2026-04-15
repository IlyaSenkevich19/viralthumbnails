# Pipeline Migration Steps

## Goal

Move product generation flows to one modular pipeline-first backend path while preserving current user features:

- input from video file upload, video URL, or prompt-only;
- optional face and/or template references;
- generation of multiple thumbnail variants in different styles;
- project creation with saved variants that can later be edited/regenerated.

## Step 0 — Confirm Target Contract

- Finalize one canonical request/response contract for the new flow.
- Decide if ranking remains required in the new pipeline path.
- Decide how `THUMBNAIL_PIPELINE_ENABLED` is used after migration (emergency kill switch vs remove).
- Define required persistence result: project row, variant rows, storage files, signed URLs.

Done criteria:

- A clear payload and output schema exists for create flow, including persisted entities.

## Step 1 — Add Persistence Layer for Pipeline Output

- Implement a service that takes pipeline run output and materializes it into:
  - `projects` row;
  - `thumbnail_variants` rows;
  - uploaded images in Storage with paths and URLs.
- Reuse `from-video` persistence rules where possible.
- Ensure robust failure handling (idempotency on `run_id`, compensation behavior on partial failures).

Done criteria:

- A pipeline result can be persisted into a real project with usable variants.

## Step 2 — Expose One Public “Create” Endpoint

- Add one HTTP entrypoint that runs orchestration + persistence in one call.
- Option A: extend `POST /thumbnails/pipeline/run` with persistence mode.
- Option B: add dedicated endpoint (for example, `POST /thumbnails/create`).
- Keep old endpoints available during transition.

Done criteria:

- One request returns `projectId` and persisted variant metadata.

## Step 3 — Reach Input Parity (IDs and URLs)

- Support both reference styles:
  - `template_id` / `avatar_id`;
  - direct reference URLs/data URLs.
- If IDs are provided, resolve them server-side to usable reference assets.
- Keep video upload and video URL ingestion parity with current behavior.

Done criteria:

- Frontend can submit existing form semantics without manual data URL assembly.

## Step 4 — Switch Frontend Create Flow

- Point frontend create actions from `from-video` to the new pipeline-backed create endpoint.
- Preserve UX behavior:
  - loading/progress;
  - credit error handling;
  - navigation to created project variants.
- Keep helper endpoints (`parse-url`, `get-video-meta`) as needed.

Done criteria:

- End-user creation flow uses pipeline path in production.

## Step 5 — Unify Project Editing/Regeneration Models

- Align project-level regeneration/edit services to the same image generation/edit model strategy used by pipeline steps.
- Remove model drift between initial creation and subsequent edits/regenerations.

Done criteria:

- “Create” and “Edit/Regenerate” use one consistent model configuration strategy.

## Step 6 — Deprecate and Remove Legacy Flow

- Mark old `from-video` flow as deprecated after migration stability period.
- Remove redundant legacy orchestration and model wiring tied to old path.
- Keep only shared/common configuration that is still actively used.
- Update docs and operator notes.

Done criteria:

- No production path depends on legacy generation orchestration.

## Step 7 — Hardening and Validation

- Add/refresh e2e coverage for:
  - prompt-only;
  - video URL;
  - uploaded video;
  - with/without template and face references;
  - OpenRouter/storage failure paths.
- Validate throttling, payload size constraints, and operational observability.
- Finalize architecture documentation diagram for the new unified flow.
- Use `docs/pipeline-hardening-runbook.md` as the operational verification checklist for failure and limits.

Done criteria:

- Unified flow is validated functionally and operationally.

## Recommended Execution Order

1. Step 0
2. Step 1
3. Step 2
4. Step 3
5. Step 4
6. Step 5
7. Step 6
8. Step 7

This order minimizes product risk: first build backend capability and persistence, then switch traffic, then remove legacy paths.
