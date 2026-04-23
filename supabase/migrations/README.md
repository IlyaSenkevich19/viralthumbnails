# Supabase SQL migrations

Apply **в порядке номеров** на вашей БД (или через `supabase db push` / CI, если настроено).

| Файл | Назначение (кратко) |
|------|----------------------|
| `001_optional_profiles.sql` | Стартовый профиль / заготовка |
| `002_projects_and_variants.sql` | Проекты и варианты превью |
| `003_storage_and_templates.sql` | Storage, шаблоны |
| `003_generation_credits.sql` | Кредиты генерации (в репо два файла `003_*` — применяйте оба; порядок между ними как принято в вашей ветке / в корневом README) |
| `004_template_niches.sql` | Ниши шаблонов |
| `005_thumbnail_templates_niche_folder_rls.sql` | RLS / папки шаблонов |
| `006_user_avatars.sql` | Аватары пользователей |
| `007_profiles_auto_create.sql` | Профили и триггеры на `auth.users` |
| `008_credit_ledger_and_credit_model_cleanup.sql` | Леджер кредитов |
| `009_pipeline_video_temp_storage_alignment.sql` | Видео temp для пайплайна |
| `010_thumbnail_pipeline_jobs.sql` | Таблица job’ов пайплайна |
| `011_thumbnail_pipeline_jobs_progress_and_active_guard.sql` | Прогресс и гварды job’ов |

**Важно:** не удаляйте файлы миграций, которые уже применены в окружениях — это ломает историю. Новые изменения схемы — только **новыми** файлами с большим номером.

См. также корневой [`README.md`](../../README.md) (раздел Quick start) для минимального набора миграций.
