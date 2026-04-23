# ViralThumbnails — пробелы относительно заявленного продукта

Чеклист по состоянию кодовой базы (не забыть при планировании). Обновляй по мере закрытия пунктов.

---

## Уже есть (базовый контур)

- [x] Аккаунт: Supabase Auth, защищённые маршруты, `GET /api/auth/me`
- [x] Проекты: CRUD, `source_type`, статусы
- [x] Генерация вариантов: `POST …/generate`, OpenRouter image / placeholder, Storage, биллинг кредитов с refund при частичном фейле
- [x] Кредиты: `profiles.generation_credits_*`, резерв на generate и pipeline (`run` / `run-video`), профиль (триггер 007 + lazy insert)
- [x] Шаблоны и ниши: API + UI
- [x] Аватары (faces): загрузка / список / удаление в Storage
- [x] Видео / YouTube → превью: async pipeline jobs (`run` / `run-video`, poll job), Create hub + project detail
- [x] Админ: YouTube inspiration (`ADMIN_USER_IDS`, API key)
- [x] Rate limiting на тяжёлые эндпоинты

---

## 1. Монетизация и планы

- [ ] Stripe (или аналог): checkout, подписки / пакеты кредитов
- [ ] Связка оплаты с `profiles` (`stripe_customer_id`, `is_pro`, квоты)
- [ ] Страница `/credits`: сейчас «preview», чекаута нет — довести до реальных апгрейдов

---

## 2. Качество генерации (промпт / мультимодал)

- [x] **Аватар в генерации:** `avatar_id` / `prioritize_face` / `face_in_thumbnail` (with face vs faceless) в `POST …/generate` + мультимодал в `ProjectVariantImageService`
- [x] **Шаблон в промпте:** подтягивается изображение шаблона из Storage как референс, если `template_id` валиден
- [ ] Отдельные поля в UI: явный «текст на превью», отдельное поле «стиль», (по желанию) aspect ratio в API — см. `docs/nanothumbnail-adoption-notes.md`
- [x] YouTube как контекст: метаданные + полный video pipeline; повторная генерация на проекте использует `source_data` / oEmbed согласованно

---

## 3. Связка video-пайплайна и проектов

- [x] Video mode сохраняет `projects` + `thumbnail_variants` через pipeline persistence (`persist_project`)
- [ ] Добавить явный UX для импорта/копирования отдельных вариантов между проектами

---

## 4. Экспорт, вотермарки, брендинг

- [ ] Вотермарк: в UI заглушка «Remove watermark» — нет наложения/снятия в пайплайне
- [ ] White-label / custom branding (заявлено в тарифах) — нет
- [ ] Пакетный экспорт, явные пресеты под YouTube 1280×720 как фича продукта

---

## 5. Тарифы vs реальность (маркетинг / честность)

- [ ] Canva import — нет
- [ ] Advanced analytics — нет
- [ ] A/B тесты превью — убраны со страницы; функционала не было
- [ ] При необходимости сузить формулировки на `/credits` до реализованного

---

## 6. Команды и внешний API

- [ ] Team / несколько мест (Agency в копирайте) — нет организаций и ролей
- [ ] Публичный API с ключами для клиентов — нет (только JWT пользователя к Nest)

---

## 7. Настройки и онбординг

- [ ] Settings: сейчас каркас + backend health; нет профиля, биллинга, уведомлений
- [ ] Опционально: онбординг «первый проект»

---

## 8. Инфраструктура

- [x] Длительная генерация pipeline: **асинхронные jobs** (`thumbnail_pipeline_jobs`) + poll с клиента (HTTP handlers не держат весь run синхронно)
- [ ] Письма (готово, счёт, алерты)
- [ ] Наблюдаемость: Sentry / трассы / структурные логи по запросам

---

## Референсы в репозитории

- Ручной QA: [`qa-manual-test-checklist.md`](./qa-manual-test-checklist.md) и `/qa-checklist` (только `development`)
- Идеи по промпту и UX: [`nanothumbnail-adoption-notes.md`](./nanothumbnail-adoption-notes.md)
- Модели OpenRouter: `apps/backend/README.md` → раздел OpenRouter
- Миграции Supabase: `supabase/migrations/README.md`
