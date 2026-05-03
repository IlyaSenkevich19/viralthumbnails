# CRM для лендинга через Google Sheets (MVP-план)

Документ для быстрого подключения CRM на лендинге через Google Sheets.
Цель: собирать лиды, UTM-атрибуцию и статус обработки без тяжелой CRM на старте.

---

## Короткий ответ: реализуемо?

Да. Это хороший стартовый вариант, если нужна скорость внедрения.

---

## Что хотим получить

- Все заявки лендинга в одну таблицу.
- Сохранение маркетинговых параметров (`utm_*`, `gclid`).
- Базовый pipeline по статусам (`new`, `contacted`, `qualified`, `paid`, `lost`).

---

## Рекомендуемая структура таблицы

Лист `leads`:

- `created_at`
- `landing_domain`
- `name`
- `email`
- `phone` (опционально)
- `message` (опционально)
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `gclid`
- `fbclid`
- `referrer`
- `page_path`
- `lead_status` (default `new`)
- `owner`
- `notes`

---

## Варианты интеграции

## Вариант A (самый быстрый): Google Apps Script Web App

1. Создать Apps Script.
2. Опубликовать как Web App (`doPost`).
3. С лендинга отправлять JSON на URL скрипта.
4. Скрипт записывает строку в `leads`.

Плюсы: очень быстро.
Минусы: меньше контроля по security/observability.

## Вариант B (чуть надежнее): через backend лендинга

1. Форма идет в backend endpoint лендинга.
2. Backend валидирует + антиспам.
3. Backend пишет в Google Sheets API (service account).

Плюсы: лучше контроль, логи, ретраи.
Минусы: чуть дольше внедрение.

---

## Вариант C (текущий монорепо): Nest → Apps Script Webhook

**Правильный путь:** браузер → **ваш API** (Next rewrite на Nest) → **Google Apps Script** (`doPost`). Не вызывать URL скрипта из клиентского JS — иначе URL в бандле, сложнее ротировать секреты и лимитировать спам.

В репозитории:

- Общая логика формирования JSON и `fetch` на `LEAD_INTAKE_WEBHOOK_URL` — **`LeadCrmWebhookService`** (`apps/backend/src/modules/lead-crm/lead-crm-webhook.service.ts`).
- **Публичные лиды (лендинг, без логина):** `POST /api/leads/intake` — `LeadsController`, DTO `PublicLeadIntakeDto` (опционально `email`, `funnel_stage`).
- **После входа в приложение (квал):** `POST /api/auth/lead-qualification` с Bearer — email из Supabase JWT, `funnel_stage: post_app_qualification_completed`, затем поле `profiles.lead_qualification_completed_at`.

Оба эндпоинта шлют **один и тот же контракт**, что ожидает ваш Apps Script (в т.ч. `lead_session_id` для upsert строки).

---

## Минимальные поля события формы (payload)

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Need 50 thumbnails/month",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "brand_search",
  "gclid": "EAIaIQobCh...",
  "page_path": "/pricing"
}
```

---

## Обязательные практики

- Валидация email на клиенте и сервере.
- Honeypot/anti-bot (минимум hidden field + timeout).
- Dedup лидов по email + ближайшему тайм-окну.
- Запись `created_at` в UTC.
- Retry при ошибках записи в Sheets.

---

## Связка с аналитикой

При отправке формы:

- отправлять событие в GA4 (`lead_submit`);
- в payload сохранять те же UTM/gclid, что идут в Sheet.

Так можно сверять:

- GA4 conversions
- фактические лиды в таблице
- дальнейшие оплаты/активации в приложении.

---

## Базовый pipeline в Google Sheets

1. `new` — новый лид.
2. `contacted` — первый контакт.
3. `qualified` — релевантный лид.
4. `paid` — оплата прошла.
5. `lost` — не закрыт.

Рекомендуется добавить условное форматирование по `lead_status`.

---

## SLA и операционные правила

- Проверка новых лидов: каждые 2-4 часа (в рабочее время).
- Ответ первому контакту: до 24 часов.
- Обновление `notes` после каждого контакта.

---

## План внедрения

1. Добавить форму на лендинге (или расширить текущую).
2. Подключить сбор UTM/gclid в hidden поля.
3. Отправлять **`POST`** на origin приложения **`/api/leads/intake`** (JSON как в таблице выше) — запрос уйдёт на Nest и далее в Apps Script (вариант **C**). Либо варианты **A/B** из разделов выше, если без Nest.
4. Добавить GA4 событие `lead_submit`.
5. QA:
   - форма отправляется;
   - строка появляется в Sheet;
   - UTM/gclid не теряются;
   - дубль отправки корректно обрабатывается (по `lead_session_id` в скрипте).

---

## Когда пора мигрировать в полноценную CRM

Сигналы:

- > 30-50 новых лидов/неделю;
- несколько менеджеров в процессе;
- нужна автоматизация цепочек писем/задач;
- нужен отчет по воронке и revenue attribution в одном месте.

До этого момента Google Sheets обычно достаточно.

