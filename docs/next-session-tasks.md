# Задачи на следующую сессию (продукт / интеграции)

Краткий чеклист из обсуждения — можно отмечать по мере выполнения.

---

## 1. Регистрация и авторизация через Google

- [ ] Проверить в **Supabase**: провайдер Google включён, redirect URLs для **prod** и **staging** совпадают с реальными origin.
- [ ] В **Google Cloud Console**: OAuth client (web), authorized redirect URIs из документации Supabase.
- [ ] Прогнать флоу: **Login** (`GoogleSignInButton` → `authApi.signInWithGoogle`) и редирект после OAuth (сейчас в коде редирект на create — убедиться, что это желаемое поведение).
- [ ] Убедиться, что новый пользователь получает профиль / не ломается триал (`/auth/me`, `TrialWelcomeGate`).

**Код ориентиры:** `apps/frontend/src/lib/api/auth.ts`, `google-sign-in-button.tsx`, `login-screen.tsx`, `use-auth-mutations.ts`.

---

## 2. Квалификация лидов (вопросы и момент показа)

- [ ] Зафиксировать **продуктово**: какие поля обязательны, какие опциональны, на каком шаге (только register vs после входа / перед триалом).
- [ ] Сверить с текущей реализацией: метаданные signup (`SignUpLeadMetadata` в `auth.ts`), `lead-attribution.ts`, `lead-intake` API, форма `auth/register` (`LeadCustomSelect` и т.д.).
- [ ] При необходимости: упростить форму, перенести часть вопросов, добавить сохранение в CRM/таблицу — по выбранному сценарию.

---

## 3. Аналитика

- [ ] Проверить **env** для GTM / dataLayer (см. `marketing-scripts.tsx`, `analytics-listeners.tsx`, `lib/analytics.ts`).
- [ ] В проде: события доходят (signup, paywall, trial_started, generation_*, credits и т.д. — grep по `trackEvent`).
- [ ] При необходимости: единая схема имён событий, документация для маркетинга, consent/cookie если нужно по юрисдикции.

---

## 4. Регрессионное тестирование

После пунктов 1–3 (или параллельно по смоук-листу):

- [ ] Auth: email + Google, sign-out, сессия после reload.
- [ ] Триал: `/welcome-trial` vs app по `trialStarted` из `/auth/me`.
- [ ] Пайплайн / кредиты / paywall (в т.ч. без блока «How thumbnail runs debit credits» — если откатывать UI, проверить заново).
- [ ] Ключевые страницы: create, projects, variants, credits.

---

## 5. Поддержка пользователей (чат / тикеты)

**Варианты (не только Intercom):**

| Вариант | Суть |
|--------|------|
| **Telegram-бот отдельно** | Например [telegram-support-bot](https://github.com/bostrot/telegram-support-bot) — свой процесс/Docker, тикеты в группе; в приложении — кнопка «Написать в Telegram». GPL-3.0 — держать отдельным репо/сервисом удобнее. |
| **Виджет SaaS** | Tawk (бесплатный tier), Crisp, Help Scout, Zendesk — чат в углу сайта без Telegram у пользователя. |
| **Свой виджет** | Кнопка внизу → модалка → `POST` на Nest → **почта** или **Telegram** (`sendMessage`). Почта: SMTP/DNS; **Telegram обычно проще** по интеграции, но везде нужны **rate limit** + валидация от спама. |

- [ ] Выбрать канал (Telegram-only / виджет / гибрид).
- [ ] Если свой виджет: endpoint + секреты (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` или почтовый провайдер).
- [ ] Повесить CTA в UI (например `AppShell` / settings / footer).

---

*Файл можно переименовать или перенести в Notion — главное, что список собран в одном месте.*
