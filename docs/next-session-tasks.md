# Задачи на следующую сессию (продукт / интеграции)

## 2. Аналитика

- [ ] Проверить **env** для GTM / dataLayer (см. `marketing-scripts.tsx`, `analytics-listeners.tsx`, `lib/analytics.ts`).
- [ ] В проде: события доходят (`signup_started`, `signup_completed`, `lead_qualification_*`, `trial_started`, `generation_*`, credits — grep по `trackEvent`).
- [ ] При необходимости: единая схема имён событий для маркетинга.

---

## 3. Регрессионное тестирование

- [ ] Auth: email + Google, sign-out, сессия после reload.
- [ ] Квал: новый пользователь → модалка → CRM → `GET /auth/me` с `leadQualificationCompleted: true`.
- [ ] Триал: `/welcome-trial` vs app по `trialStarted` из `/auth/me`.
- [ ] Пайплайн / кредиты / paywall.
- [ ] Ключевые страницы: create, projects, variants, credits.

---

## 4. Оплаты MVP (ссылка от посредника → письмо → зачисление кредитов)

**Кратко:** посредник даёт платёжную ссылку → письмо с email плательщика → сопоставить пользователя → начислить кредиты. Подробно: сравнение вариантов (ручное, Apps Script, Zapier/Make/n8n, poller в Nest), почему это не как Support Widget, рекомендуемые этапы и техтребования — в **[`docs/payments-mvp-email-to-credits.md`](./payments-mvp-email-to-credits.md)**.

### Чеклист

- [ ] Прочитать **`docs/payments-mvp-email-to-credits.md`** и выбрать этап (A ручной → B автоматизация → C Stripe).
- [ ] Зафиксировать у посредника **пример письма** после оплаты.
- [ ] Начисление только через **ledger / billing** (см. `manual-payments-crediting-plan.md`), с секретом и идемпотентностью при любом HTTP из автоматики.

---

*Файл можно перенести в Notion — главное, что список собран в одном месте.*
