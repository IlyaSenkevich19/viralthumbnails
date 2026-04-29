# Runbook по устойчивости pipeline

Этот runbook проверяет обработку ошибок и операционные лимиты для:

- `POST /api/thumbnails/pipeline/run` (JSON)
- `POST /api/thumbnails/pipeline/run-video` (multipart)
- `GET /api/thumbnails/pipeline/jobs/:jobId` (поллинг асинхронных запусков)

Используйте валидный bearer-токен (`$TOKEN`) и базовый URL backend (`$API`, например `http://localhost:3001/api`).

## 0) Предусловия

- Backend запущен.
- Миграции Supabase применены.
- У тестового пользователя есть кредиты (`GET /billing/credits`).
- У вас есть:
  - один валидный video URL и один невалидный URL,
  - один валидный `template_id` и `avatar_id` (опционально),
  - один небольшой локальный видеофайл и один слишком большой файл (>80MB).

## 1) Базовые проверки успешного сценария

### 1.1 JSON pipeline: enqueue + поллинг

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

Ожидаем:

- `200` enqueue response
- `job_id`
- `status=queued|running`

Затем опрашиваем статус:

```bash
curl -sS "$API/thumbnails/pipeline/jobs/<JOB_ID>" \
  -H "Authorization: Bearer $TOKEN"
```

Ожидаем переход в `status=succeeded` и наличие `result.persisted_project.project_id`.

### 1.2 Video pipeline: enqueue + поллинг (multipart)

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run-video" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/absolute/path/to/video.mp4" \
  -F "count=4" \
  -F "prompt=Emphasize facial reaction and bold text"
```

Ожидаем:

- `200` enqueue response with `job_id`
- polling reaches `status=succeeded`
- `result.persisted_project.project_id` exists

## 2) Негативные сценарии

### 2.1 Сбой OpenRouter

Временно установите невалидный `OPENROUTER_API_KEY` и перезапустите backend.

Повторите сценарий 1.1 и ожидайте:

- job eventually reaches `failed`,
- failure reason appears in job `error`,
- отсутствие необработанного падения процесса.

После проверки верните корректный ключ.

### 2.2 Сбой Storage

Сломайте запись в Storage (неверный service role key или запрет записи в bucket policy в тестовом окружении).

Запустите 1.1 и ожидайте:

- non-2xx,
- pipeline fails during persistence/upload,
- отсутствие «осиротевших» частичных строк в БД (либо они компенсирующе удаляются — в зависимости от текущей реализации),
- в логах backend есть контекст storage-ошибки.

После проверки восстановите конфиг/политики storage.

### 2.3 Недоступные референсы

Используйте фейковые ID:

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

Ожидаем:

- request can still succeed,
- response includes:
  - `resolved_references.template_from_id=false`
  - `resolved_references.face_from_id=false`
  - `warnings[]` entries for unresolved refs.

### 2.4 Возврат кредитов при ошибке

Порядок действий:

1. Считать баланс кредитов (до).
2. Вызвать детерминированную ошибку после резерва (например, через сломанный storage как в 2.2).
3. Считать баланс кредитов (после).

Ожидаем:

- итоговая дельта баланса `0` для упавшего запуска (зарезервированные кредиты возвращены).

## 3) Проверка throttling

`THROTTLE_PIPELINE_RUN` сейчас применяется к эндпоинтам pipeline:

- limit: `8`
- window: `1h`

Быстрая проверка:

- отправьте 9 быстрых запросов в `pipeline/run` (или `pipeline/run-video`),
- ожидайте, что 9-й запрос вернет `429`.

## 4) Проверка лимитов payload

### 4.1 Лимит JSON body

Глобальный лимит JSON body в backend — `15mb`.

Отправьте oversized JSON в `pipeline/run` (большой `base_image_data_url`).

Ожидаем:

- `413 Payload Too Large` (or framework-specific 4xx payload error).

### 4.2 Лимит multipart-файла (`run-video`)

`run-video` uses `FileInterceptor` limit `80MB`.

Загрузите файл >80MB:

```bash
curl -sS -X POST "$API/thumbnails/pipeline/run-video" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/absolute/path/to/oversized-video.mp4" \
  -F "count=4"
```

Ожидаем:

- `413` или отказ multer по лимиту размера файла.

## 5) Проверка наблюдаемости (observability)

Для каждого негативного сценария проверьте, что в логах есть:

- эндпоинт и статус,
- подсказки по корневой причине (OpenRouter/storage/validation),
- отсутствие падения процесса и «зависших» запросов.

## 6) Чеклист финального подтверждения

- [ ] Подтвержден успешный сценарий JSON pipeline
- [ ] Подтвержден успешный сценарий multipart video pipeline
- [ ] Подтверждена корректная обработка сбоя OpenRouter
- [ ] Подтверждена корректная обработка сбоя Storage
- [ ] Неразрешенные референсы отражаются в `warnings` ответа
- [ ] Подтвержден возврат кредитов при ошибке запуска
- [ ] Подтвержден throttling (429 при превышении)
- [ ] Подтверждены лимиты payload (JSON + multipart)
