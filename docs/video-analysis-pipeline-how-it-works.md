# Pipeline анализа видео: как это работает

Этот документ описывает **фактический runtime-флоу** анализа видео в thumbnail pipeline на backend.

Область:
- `POST /api/thumbnails/pipeline/run`
- `POST /api/thumbnails/pipeline/run-video`
- async jobs, анализ, сборка промптов, генерация изображений, опциональная персистентность

---

## 1) Точки входа

## `POST /api/thumbnails/pipeline/run`
- Принимает JSON payload (`ThumbnailPipelineRunDto`).
- Опционально включает `video_url`.
- Создает async job и возвращает `job_id`.

## `POST /api/thumbnails/pipeline/run-video`
- Принимает multipart (`file`) или `videoUrl`.
- Сначала выполняет ingest и получает пригодный video URL.
- Собирает payload для `run` (`generate_images: true`, `persist_project: true`).
- Создает async job и возвращает `job_id`.

Оба эндпоинта ограничивают пользователя одним активным pipeline job (`PIPELINE_JOB_ALREADY_ACTIVE`).

---

## 2) Защита перед анализом: политика длительности (Phase 0/1)

`VideoPipelineDurationGateService.resolveContextAndEnforceForPipeline(...)`

- Если upload:
  - пытается определить длительность через `ffprobe` из буфера файла.
- Если YouTube URL:
  - пытается получить длительность через YouTube Data API (если задан `YOUTUBE_DATA_API_KEY`).
- Если длительность известна и больше `VIDEO_PIPELINE_MAX_DURATION_SECONDS`:
  - бросает `VIDEO_EXCEEDS_MAX_DURATION`.
- Возвращает метаданные `video_context`:
  - `duration_seconds`
  - `duration_resolution`
  - `max_duration_seconds`
  - `analyzed_window`

Это выполняется до enqueue для `run-video` и до enqueue для `run`, когда передан `video_url`.

---

## 3) Модель асинхронного выполнения

`ThumbnailPipelineJobsRunnerService`

- Интервал поллинга: ~1500ms.
- Забирает queued job с lease (`JOB_LEASE_MS`).
- Помечает «просроченные» running jobs как failed.
- Выполняет через `ThumbnailPipelineExecutionService`.
- Один раз ретраит transient-ошибки (`429`, `5xx`, timeout/network patterns).
- Обновляет прогресс job и опциональный project pipeline status на каждом этапе.

---

## 4) Этап 1: Resolve references

`ThumbnailPipelineExecutionService.execute(...)`

- Разрешает `template_id` и `avatar_id` в data URL.
- Сохраняет порядок референсов:
  1. template images
  2. face images
- Маппит API payload во вход orchestrator:
  - `variantCount`
  - `generateImages`
  - `imageModelTier` (`default` / `premium`)
  - `prioritizeFace`
  - optional edit fields

---

## 5) Этап 2: Анализ источника (VL/text)

`ThumbnailPipelineOrchestratorService.run(...)` вызывает:

1. Опциональный refine промпта (`PipelinePromptRefinementService`).
2. Опциональную загрузку компактного YouTube transcript.
3. `PipelineVideoUnderstandingService.analyze(...)`.

Поведение `PipelineVideoUnderstandingService`:

- Если нет видео и нет референсов:
  - использует локальную text-only эвристику (без VL-вызова).
- Если видео есть:
  - сначала пробует frame sampling (`VideoFrameSampleService`).
  - если кадры получены, отправляет их как image inputs.
  - иначе делает fallback на `video_url`.
- Порядок моделей:
  - primary: `google/gemini-2.5-flash`
  - fallback: `google/gemini-2.0-flash-001`
- Ожидает JSON, соответствующий `ThumbnailPipelineAnalysisSchema`.
- Если schema/JSON невалидны, ретраит со более строгим промптом «fix output» (`MAX_JSON_RETRIES`).

Выход:
- `analysis`
- `modelUsed`

---

## 6) Этап 3: Build prompts

`PipelinePromptBuilderService.buildFinalImagePrompts(...)`

- Использует структурированный анализ + пользовательский prompt/style.
- Генерирует `count` промптов (`variant_count`, ограничен 1..12).
- Добавляет строку инструкции по референсам, когда есть template/face refs.

---

## 7) Этап 4: Генерация изображений (опционально)

Выполняется только когда `generate_images=true`.

`PipelineThumbnailGenerationService.generateVariants(...)`

- Выбирает image model по tier:
  - `default` -> `black-forest-labs/flux.2-pro`
  - `premium` -> `black-forest-labs/flux.2-max`
- Для каждого промпта (последовательный цикл):
  - отправляет prompt (+ refs при наличии) в OpenRouter.
- Отдает счетчики прогресса для UI-поллинга.
- Бросает `PIPELINE_NO_IMAGES_GENERATED`, если ни один вариант не вернул изображение.

---

## 8) Этап 5: Редактирование изображения (опционально)

Выполняется только если присутствуют оба поля:
- `base_image_data_url`
- `edit_instruction`

`PipelineThumbnailEditingService.editThumbnail(...)`

Добавляет одну дополнительную биллинговую операцию.

---

## 9) Поведение биллинга

`ThumbnailPipelineOrchestratorService`

- Резервирует оценочное число кредитов заранее (`thumbnailPipelineCreditCost`).
- При успехе:
  - считает фактически использованные операции,
  - возвращает разницу.
- При ошибке:
  - возвращает полный резерв.

---

## 10) Персистентность результата (опционально)

Выполняется только если `persist_project=true` и есть варианты.

`PipelineProjectPersistenceService.persist(...)`

- Загружает сгенерированные изображения в storage.
- Создает или обновляет проект и варианты.
- Возвращает signed URL в result payload.

---

## 11) API-результат и стадии прогресса

Эндпоинт статуса job:
- `GET /api/thumbnails/pipeline/jobs/:jobId`

Стадии прогресса:
- `queued`
- `resolving_references`
- `analyzing_source`
- `building_prompts`
- `generating_images`
- `persisting_project`
- `completed`
- `failed`

Успешный результат включает:
- `analysis`
- `image_prompts_used`
- `models_used`
- `variants` (base64 для non-persisted флоу)
- `persisted_project` (если включено)
- `video_context`

---

## 12) Ключевые файлы реализации

- Контроллер:
  - `apps/backend/src/modules/thumbnail-pipeline/thumbnail-pipeline.controller.ts`
- Jobs:
  - `apps/backend/src/modules/thumbnail-pipeline/services/thumbnail-pipeline-jobs-runner.service.ts`
- Маппинг выполнения:
  - `apps/backend/src/modules/thumbnail-pipeline/services/thumbnail-pipeline-execution.service.ts`
- Оркестрация:
  - `apps/backend/src/modules/thumbnail-pipeline/services/thumbnail-pipeline-orchestrator.service.ts`
- Анализ видео:
  - `apps/backend/src/modules/thumbnail-pipeline/services/pipeline-video-understanding.service.ts`
- Генерация изображений:
  - `apps/backend/src/modules/thumbnail-pipeline/services/pipeline-thumbnail-generation.service.ts`
- Ограничение длительности:
  - `apps/backend/src/modules/video-thumbnails/services/video-pipeline-duration-gate.service.ts`

