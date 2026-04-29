# Анализ видео для превью — спецификация (reference)

Этот документ фиксирует **продуктовую цель**, **текущее реализованное поведение**, **целевые идеи, которые еще не внедрены**, и **где находится код**.  
Для конкретной runtime-последовательности (по этапам) см. [video-analysis-pipeline-how-it-works.md](./video-analysis-pipeline-how-it-works.md).

---

## 1. Постановка проблемы

Полные загрузки (например, часовые видео) плохо подходят для подхода «отправить всё видео в VL-модель одним запросом»:

- Стоимость и задержка растут пропорционально обработке длинных `video_url` у провайдера.
- Для небольшого числа вариантов превью отдача снижается после ограниченного контекста (метаданные + короткий фрагмент транскрипта + несколько кадров).

**Принцип продукта:** давать сильные *идеи* для превью при **ограниченных** стоимости и задержке, а не добиваться семантического понимания каждой секунды файла.

---

## 2. Текущая реализация (уже в проде)

| Область | Поведение |
|------|----------|
| **Эндпоинты** | `POST /api/thumbnails/pipeline/run` (JSON) и `POST /api/thumbnails/pipeline/run-video` (multipart) ставят async jobs в очередь; статус опрашивается через `GET /api/thumbnails/pipeline/jobs/:jobId`. Алиас: `POST /api/thumbnails/pipeline/jobs` (тот же body, что у `pipeline/run`). |
| **Ingest** | Файл -> временная загрузка в Supabase -> signed URL как `video_url`; также поддерживается удаленный `videoUrl`. |
| **Duration** | Ограничение длительности + `video_context` (метаданные Phase 1) через `VideoPipelineDurationGateService`. |
| **VL** | Предпочтение **K** JPEG-кадрам (`image_url` data URL) из **ffmpeg** в ограниченном окне; иначе fallback на **`video_url`**. Опционально добавляется YouTube **caption snippet** в текст. |
| **Downstream** | Построение промпта -> генерация изображений -> опциональное сохранение проекта. |
| **Jobs** | Таблица БД `thumbnail_pipeline_jobs`, in-process runner, lease expiry, ограниченные transient retries. |
| **Клиент** | Обогащение YouTube-метаданных в UI; browser helper для trim загрузок (`trim-video-for-thumbnails`) — это не server-side trim. |

**Оставшиеся gap’ы относительно stretch goals:** ASR-транскрипт не только для YouTube; покрытие середины/длины видео за пределами первого окна; более сильный perceptual dedup; общий кэш (Redis/KV); выделенный парк воркеров; более богатый UX для сценария “no captions”.

---

## 3. Целевая архитектура (north star)

Этапы, которые пока рассматриваются как **design reference** (реализованы не полностью):

1. Вход — URL или upload (сделано).
2. Недорогие метаданные — длительность, title, channel (частично сделано).
3. Политика длительности — жесткий максимум + analyzed window (политика сделана; sampling пока смещен к началу).
4. Транскрипт — опционально, в рамках бюджета (MVP YouTube captions сделан).
5. Sampling кадров — ограниченное окно + K кадров + дешевые фильтры (MVP сделан).
6. Предфильтрация — dedup/quality (MVP сделан; не полный pHash pipeline).
7. LLM-контекст — компактный мультимодальный пакет (MVP сделан).
8. Генерация изображений — отдельно от VL (сделано).

Trade-offs и UX-ожидания (оценка кредитов, статусы прогресса, тексты ошибок) остаются в зоне продуктового guidance; операционные проверки: [pipeline-hardening-runbook.md](./pipeline-hardening-runbook.md).

---

## 4. Связанный код

- Pipeline: `apps/backend/src/modules/thumbnail-pipeline/` (`thumbnail-pipeline-execution.service.ts`, `thumbnail-pipeline-jobs*.ts`, `thumbnail-pipeline.controller.ts`)
- VL payload: `apps/backend/src/modules/thumbnail-pipeline/services/pipeline-video-understanding.service.ts`, `apps/backend/src/modules/openrouter/multipart-user-content.ts`
- Helpers для кадров/длительности: `apps/backend/src/modules/video-thumbnails/services/video-frame-sample.service.ts`, `video-duration-ffprobe.ts`
- Транскрипт: `apps/backend/src/modules/video-thumbnails/services/youtube-transcript.service.ts`
- Конфиг: `apps/backend/src/config/video-pipeline.config.ts`

---

## 5. История документа

- **2026-04-16** — Первичная длинная фазовая спецификация.
- **2026-04-17** — Укорочено фазовое повествование, фокус на уровне спецификации.
- **2026-04-24** — Добавлена ссылка на runtime-документ `video-analysis-pipeline-how-it-works.md`.
