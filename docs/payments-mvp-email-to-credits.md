# Оплаты MVP: ссылка посредника → письмо → зачисление кредитов

Документ фиксирует **бизнес-флоу** и **варианты реализации**, пока нет своего Stripe merchant-аккаунта в продукте: посредник даёт **платёжную ссылку**, после оплаты на **почту** приходит уведомление с **email плательщика**, нужно **найти пользователя** и **начислить кредиты** в БД.

Связанные материалы: [`manual-payments-crediting-plan.md`](./manual-payments-crediting-plan.md), чеклист в [`next-session-tasks.md`](./next-session-tasks.md) §4.

### Тестовый endpoint в репозитории (Nest)

После миграции **`014_manual_credit_claims.sql`** и переменной **`MANUAL_BILLING_WEBHOOK_SECRET`**:

- **`POST /api/billing/manual-credit`** (без JWT), заголовок **`X-Manual-Billing-Secret`**: то же значение, что в env.
- Тело JSON: `email`, `external_payment_id` (уникальный id оплаты от посредника), `credits` (целое 1…50000), опционально `plan_code`, `source`.
- Идемпотентность по **`external_payment_id`** + строка в **`manual_credit_claims`**; в **`credit_ledger`** запись с `reason: purchase`, `reference_type: manual_external_payment`.

Пример `curl` (локально):

```bash
curl -s -X POST http://localhost:3001/api/billing/manual-credit \
  -H "Content-Type: application/json" \
  -H "X-Manual-Billing-Secret: YOUR_SECRET" \
  -d '{"email":"user@example.com","external_payment_id":"mediator_test_001","credits":50,"source":"curl_test"}'
```

Код: `apps/backend/src/modules/billing/manual-credit.controller.ts`, `manual-credit.service.ts`, `billing.service.ts` (`grantManualExternalPaymentCredits`).

---

## 1. Почему это не «как Support Widget»

**Support Widget:** браузер пользователя сам делает `POST` на твой Nest → дальше сервер шлёт в Telegram. Источник события — **HTTP из клиента**.

**Письмо об оплате:** оно попадает на **почтовый сервер** (Gmail и т.д.). У Nest **нет встроенного входа «письмо пришло»**. Нужен либо **внешний коннектор** (Zapier, inbound parse, Apps Script), либо **сам опрос почты** (cron + Gmail API / IMAP), либо **ручное действие** (админка / SQL по инструкции).

Итого: «только Nest, как виджет» без слоя между почтой и HTTP **нельзя** — почта сама HTTP на API не шлёт.

---

## 2. Варианты автоматизации (кратко)

| Вариант | Плюсы | Минусы |
|--------|--------|--------|
| **Ручное начисление** | Ноль хрупкости парсера, быстрый старт | Твоё время |
| **Google Apps Script + Gmail** | Бесплатно, уже экосистема Google (CRM в Sheets), `UrlFetchApp` на секретный Nest | Парсинг тела письма хрупкий; квоты Apps Script |
| **Inbound Parse** (SendGrid, Mailgun, CloudMailin…) | Письмо → готовый HTTP POST на Nest | Отдельный сервис, настройка DNS/пересылки |
| **Make (бесплатный tier)** | Мало кода, лимиты по операциям | Зависимость от SaaS, лимиты |
| **Zapier** | Проще всего «мышкой» | Обычно **дороже** на том же сценарии |
| **n8n self-host** | 0 лицензии, гибко | Свой хостинг, обновления, чуть больше DevOps |
| **Nest + cron + Gmail API / IMAP** | Всё в монорепо, полный контроль | Токены, refresh, квоты, поддержка кода |

**Поллер по расписанию** (раз в N минут: найти письма по `subject:` / отправителю, распарсить, вызвать Nest) — это **не webhook**, а **scheduled job**; по надёжности те же риски парсинга, что и у Apps Script.

---

## 3. Рекомендуемая стратегия (по этапам)

### Этап A — ручной (1–2 недели или пока мало оплат)

1. Получить от посредника **пример реального письма** (тема, тело, откуда берётся email).
2. По письму начислять кредиты по [`manual-payments-crediting-plan.md`](./manual-payments-crediting-plan.md) (ledger / `profiles`, без «голого» UPDATE без истории).

**Зачем:** убедиться в формате писем и объёме до того, как автоматизировать.

### Этап B — автоматизация без Zapier (предпочтительно для тебя)

**Google Apps Script:** триггер по времени или обработка писем с фильтром (тема / отправитель) → парсинг → `UrlFetchApp.fetch` на **секретный** `POST https://<api>/.../internal/payment-notify` с телом `{ payerEmail, idempotencyKey, ... }`.

На **Nest:** один endpoint, проверка секрета, поиск пользователя по email, начисление кредитов, **идемпотентность** (например по `Message-Id` письма или стабильному хэшу — хранить в таблице `processed_payment_emails`).

### Этап C — целевое состояние

Свой **Stripe Checkout + webhooks** в Nest — без почты как источника истины.

---

## 4. Технические требования к любому автоматическому пути

1. **Секрет** на вызов Nest (заголовок `Authorization: Bearer …`, или приватный URL + ротация).
2. **Идемпотентность:** одно письмо / одно уведомление не должно начислить дважды.
3. **Нормализация email** при поиске пользователя (`auth.users` / `profiles`).
4. **Политика «пользователь не найден»:** лог + алерт, не молча терять деньги.
5. **Смена шаблона письма** у посредника = риск поломки парсера — договориться о стабильном формате или иметь fallback (ручная обработка).

---

## 5. Zapier / Make / n8n — когда иметь смысл

- **Zapier** — если нужен самый быстрый no-code и бюджет не критичен.
- **Make** — часто **дешевле** на MVP за счёт бесплатного tier с лимитом операций.
- **n8n self-host** — если не хочешь платить за Zapier и готов держать один маленький сервис; гибче Make, но своя эксплуатация.

Все они по сути делают то же, что Apps Script: **событие на почте → HTTP в Nest**.

---

*При изменении продукта (свой Stripe) этот документ можно сузить до архивной заметки или удалить устаревшие разделы.*
