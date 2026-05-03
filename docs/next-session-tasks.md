# Задачи на следующую сессию (продукт / интеграции)

Краткий чеклист — можно отмечать по мере выполнения.

---

## 1. Регистрация и авторизация через Google

- [ ] Проверить в **Supabase**: провайдер Google включён, redirect URLs для **prod** и **staging** совпадают с реальными origin.
- [ ] В **Google Cloud Console**: OAuth client (web), authorized redirect URIs из документации Supabase.
- [ ] Прогнать флоу: **Login / Register** (`GoogleSignInButton` → `authApi.signInWithGoogle`), редирект на `/create`, затем при новом пользователе — **модалка квала** → `/welcome-trial` при `trialStarted === false`.
- [ ] Убедиться, что новый пользователь получает `profiles` и миграция **`013_lead_qualification_completed_at.sql`** применена в Supabase.

**Код:** `apps/frontend/src/lib/api/auth.ts`, `google-sign-in-button.tsx`, `login-screen.tsx`, `auth/register/page.tsx`, `components/layout/lead-qualification-gate.tsx`, `components/onboarding/lead-qualification-modal.tsx`.

---

## 2. Лиды и CRM (Google Sheets)

**Реализовано:** один серверный путь в вебхук — `LeadCrmWebhookService` (`apps/backend/src/modules/lead-crm/`):

| Эндпоинт | Назначение |
|----------|------------|
| `POST /api/leads/intake` | Публично (без JWT), throttle; лендинги / тесты `curl`. |
| `POST /api/auth/lead-qualification` | После входа, Bearer; email из JWT; выставляет `lead_qualification_completed_at`. |

Клиент **никогда** не шлёт запросы напрямую на URL Apps Script — только на свой origin `/api/...` → rewrite на Nest.

- [ ] В проде: **`LEAD_INTAKE_WEBHOOK_URL`** в env бэкенда (корневой `.env` читается Nest).
- [ ] Проверить строку в Google Sheet после тестового `POST /api/leads/intake` и после прохождения модалки квала.

**Док:** `docs/landing-crm-google-sheets-plan.md`, `apps/backend/README.md`.

---

## 3. Аналитика

- [ ] Проверить **env** для GTM / dataLayer (см. `marketing-scripts.tsx`, `analytics-listeners.tsx`, `lib/analytics.ts`).
- [ ] В проде: события доходят (`signup_started`, `signup_completed`, `lead_qualification_*`, `trial_started`, `generation_*`, credits — grep по `trackEvent`).
- [ ] При необходимости: единая схема имён событий для маркетинга.

---

## 4. Регрессионное тестирование

- [ ] Auth: email + Google, sign-out, сессия после reload.
- [ ] Квал: новый пользователь → модалка → CRM → `GET /auth/me` с `leadQualificationCompleted: true`.
- [ ] Триал: `/welcome-trial` vs app по `trialStarted` из `/auth/me`.
- [ ] Пайплайн / кредиты / paywall.
- [ ] Ключевые страницы: create, projects, variants, credits.

---

## 5. Поддержка пользователей (чат / тикеты)

**Варианты (не только Intercom):**

| Вариант | Суть |
|--------|------|
| **Telegram-бот отдельно** | Например [telegram-support-bot](https://github.com/bostrot/telegram-support-bot) — свой процесс/Docker; в приложении — кнопка «Написать в Telegram». |
| **Виджет SaaS** | Tawk, Crisp, Help Scout, Zendesk. |
| **Свой виджет** | `POST` на Nest → почта или Telegram; нужны **rate limit** + валидация. |

- [ ] Выбрать канал.
- [ ] Endpoint + секреты при своём виджете.
- [ ] CTA в UI.

---

*Файл можно перенести в Notion — главное, что список собран в одном месте.*
