# Analytics: события paywall (GA4 / GTM / дашборды)

Цель документа: быстро навесить в GTM триггеры на воронку **нехватки кредитов** и понимать, где пользователи отваливаются.

## Куда попадают события

В приложении большинство измерений идёт через **`trackEvent`** (`apps/frontend/src/lib/analytics.ts`): push в **`window.dataLayer`** с полем **`event`** = имя события и параметрами в том же объекте.

Отдельные шаги воронки пробрасываются из кода через **`emitPaywallFunnelEvent`** → кастомное событие окна **`vt:funnel`** → **`AnalyticsListeners`** снова вызывает **`trackEvent`** под тем же именем. То есть в **dataLayer** всё выглядит одинаково: один объект на событие.

Проверка: GTM Preview / GA4 DebugView — искать имена ниже после действий «открыть paywall», «закрыть», «перейти на credits».

---

## 1. Модальное окно «Add credits» (основная воронка)

| Событие (`event`)           | Когда                                                                       | Основные параметры |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| **`paywall_viewed`**          | Открылся модальный paywall недостатка кредитов                               | `title` (string; часто см. код), `need`, `have` (number, могут быть `undefined` если не передали контекст) |
| **`paywall_dismissed`**       | Модальный paywall закрыт (backdrop, Escape, явные кнопки или ссылка на credits) | **`reason`** (string, см. ниже), `title`, `need`, `have` |
| **`paywall_cta_clicked`**     | Явный CTA переход на полную страницу кредитов                                | `cta` (= `credits_page_full`), `need`, `have` |

### Значение `reason` у `paywall_dismissed`

Использовать как **dimension / filter** в отчётах:

| `reason`               | Интерпретация                          |
| ----------------------- | ---------------------------------------- |
| `overlay`               | Клик по затемнению под модалкой         |
| `escape`                | Клавиша Escape                           |
| `close_button`          | Кнопка Close в шапке                   |
| `continue_editing`      | Кнопка Continue editing                  |
| `credits_page_nav`      | Ссылка «Credits page …» — обычно вместе с `paywall_cta_clicked` |

Практическая воронка в одном пользовательском замах на продукт:

1. `paywall_viewed`
2. далее один из исходов:
   - `paywall_cta_clicked` + `paywall_dismissed` с `reason` = **`credits_page_nav`** — ушёл смотреть баланс/пакеты;
   - только `paywall_dismissed` с **`overlay`** / **`escape`** / **`continue_editing`** — отвал без перехода на страницу.

---

## 2. Прочие события вокруг кредитов (до/вместо модалки)

| Событие (`event`)                 | Источник | Когда / смысл |
| ---------------------------------- | -------- | ------------- |
| **`paywall_cta_shown`**            | funnel   | Прямо перед открытием paywall по пути ошибки/API из `toastInsufficientCreditsFromApi` (`title` задаёт заголовок) |
| **`paywall_precheck_blocked`**     | funnel   | Клиентский пречек: не хватило кредита до отправки действия (`need`, `have`) |
| **`paywall_api_insufficient_credits`** | funnel | Сервер вернул `INSUFFICIENT_CREDITS` после запроса |
| **`credits_low_hint`**             | funnel   | Показан тост «последний кредит» на дашборде (`balance`) |

Эти имена имеет смысл класть в ту же Exploration в GA4 — видно расхождение между пречеком и отказом уже после запроса к серверу.

---

## 3. GTM: минимальный набор триггеров

Рекомендуемые **Custom Events** по имени **`event`** (или вашему data layer variable имени события):

- Триггер **Paywall viewed** → `paywall_viewed`
- Триггер **Paywall dismissed** → `paywall_dismissed`
- Триггер **Paywall CTA** → `paywall_cta_clicked`

Для каждого — **GA4 Event** tag с параметрами события, мапящими переменные DLV:

- `paywall_reason` ← `reason` (только для `paywall_dismissed`)
- `paywall_need` / `paywall_have` ← `need` / `have` где есть
- `paywall_title` ← `title` где есть

После сохранения — проверить в GA4 (**Configure → Custom definitions → Custom dimensions**) при необходимости.

---

## 4. Связь с активацией аккаунта (не модалка)

Событие **`trial_started`** в dataLayer сохранено для истории интеграций: оно срабатывает после успешного **`startCreditTrial`** на welcome-экране (стартерные кредиты). К воронке paywall по желанию примыкает как более ранняя точка («активировал старт» → позже попал на `paywall_*` при исчерпании).

---

## 5. Код как источник правды по именам

- Прямые вызовы: `apps/frontend/src/components/paywall/insufficient-credits-paywall.tsx`
- Вороночные события: `apps/frontend/src/lib/paywall-notify.ts`, `trial-paywall-surfaces.tsx`
- Перевод `vt:funnel` → dataLayer: `apps/frontend/src/components/marketing/analytics-listeners.tsx`

При добавлении новых `reason` или событий — обновляй этот файл в том же PR.
