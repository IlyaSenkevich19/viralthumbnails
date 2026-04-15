# Thumbnail Pipeline Module

Pipeline-first thumbnail generation module.

## Endpoints

- `POST /api/thumbnails/pipeline/run` (JSON)
- `POST /api/thumbnails/pipeline/run-video` (multipart)

Both endpoints run the same orchestrator and can persist generated variants into:

- `projects`
- `thumbnail_variants`
- Supabase Storage (`project-thumbnails`)

## Internal flow

1. Optional video ingest (`run-video`) through `VideoIngestionService`.
2. Optional template/avatar reference resolution (`ProjectVariantImageService` helper).
3. `ThumbnailPipelineOrchestratorService`:
   - reserve credits
   - analyze prompt/video/reference context (VL step)
   - build prompts
   - generate/edit images
   - refund credits on failure
4. Optional persistence via `PipelineProjectPersistenceService`.
5. Temp video cleanup for multipart ingest path.

## Key files

- `thumbnail-pipeline.controller.ts` — transport + request wiring
- `services/thumbnail-pipeline-orchestrator.service.ts` — main business flow
- `services/pipeline-project-persistence.service.ts` — DB + storage persistence
- `dto/thumbnail-pipeline-run.dto.ts` — JSON contract
- `dto/thumbnail-pipeline-run-video.dto.ts` — multipart video contract
- `thumbnail-pipeline-feature.ts` — production feature gate
