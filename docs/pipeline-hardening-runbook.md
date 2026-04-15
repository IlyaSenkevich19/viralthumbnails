# Pipeline Hardening Runbook

This runbook verifies failure handling and operational limits for:

- `POST /api/thumbnails/pipeline/run` (JSON)
- `POST /api/thumbnails/pipeline/run-video` (multipart)

Use a valid bearer token (`$TOKEN`) and backend base URL (`$API`, e.g. `http://localhost:3001/api`).

## 0) Preconditions

- Backend is running.
- Supabase migrations are applied.
- Test user has credits (`GET /billing/credits`).
- You have:
  - one valid video URL and one invalid URL,
  - one valid template id and avatar id (optional),
  - one small local video file and one oversized file (>80MB).

## 1) Baseline success checks

### 1.1 JSON pipeline with persistence

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_prompt":"High CTR YouTube thumbnail for productivity tips",
    "variant_count":4,
    "generate_images":true,
    "persist_project":true
  }'
```

Expect:

- `200`
- `run_id`
- `persisted_project.project_id`
- `persisted_project.variants[].signed_url`

### 1.2 Video pipeline (multipart)

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run-video" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/absolute/path/to/video.mp4" \
  -F "count=4" \
  -F "prompt=Emphasize facial reaction and bold text"
```

Expect:

- `200`
- persisted project payload as above

## 2) Negative cases

### 2.1 OpenRouter failure

Temporarily set invalid `OPENROUTER_API_KEY` and restart backend.

Run 1.1 again and expect:

- non-2xx (usually `500`),
- no persisted project,
- request fails fast enough,
- no unhandled crash.

Then restore key.

### 2.2 Storage failure

Break Storage write (wrong service role key or deny bucket write policy in test env).

Run 1.1 and expect:

- non-2xx,
- pipeline fails during persistence/upload,
- no orphaned partial DB rows (or they are compensatingly removed, depending on current behavior),
- backend logs include storage error context.

Restore storage config/policies after check.

### 2.3 Unavailable references

Use fake IDs:

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_prompt":"Tech review thumbnail",
    "variant_count":2,
    "generate_images":true,
    "persist_project":true,
    "template_id":"missing-template-id",
    "avatar_id":"missing-avatar-id"
  }'
```

Expect:

- request can still succeed,
- response includes:
  - `resolved_references.template_from_id=false`
  - `resolved_references.face_from_id=false`
  - `warnings[]` entries for unresolved refs.

### 2.4 Billing refund on failure

Procedure:

1. Read credits balance (before).
2. Trigger deterministic failure after reservation (for example with broken storage as in 2.2).
3. Read credits balance (after).

Expect:

- net balance delta is `0` for failed run (reserved credits refunded).

## 3) Throttling checks

`THROTTLE_VIDEO_FROM` currently applies to pipeline run endpoints:

- limit: `8`
- window: `1h`

Quick check:

- send 9 requests rapidly to `pipeline/run` (or `pipeline/run-video`),
- expect 9th request returns `429`.

## 4) Payload limit checks

### 4.1 JSON body limit

Global JSON body limit in backend is `15mb`.

Send oversized JSON to `pipeline/run` (huge `base_image_data_url`).

Expect:

- `413 Payload Too Large` (or framework-specific 4xx payload error).

### 4.2 Multipart file limit (`run-video`)

`run-video` uses `FileInterceptor` limit `80MB`.

Upload a file >80MB:

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run-video" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/absolute/path/to/oversized-video.mp4" \
  -F "count=4"
```

Expect:

- `413` or multer file-size rejection.

## 5) Observability checks

For each negative case, verify logs include:

- endpoint and status,
- root cause hints (OpenRouter/storage/validation),
- no process crash or stuck request.

## 6) Sign-off checklist

- [ ] JSON pipeline success path confirmed
- [ ] multipart video pipeline success path confirmed
- [ ] OpenRouter failure handled
- [ ] Storage failure handled
- [ ] unresolved refs surfaced in response warnings
- [ ] billing refund verified on failed run
- [ ] throttling enforced (429 on overflow)
- [ ] payload limits enforced (JSON + multipart)
