/**
 * ViralThumblify — оплаты посредника: Gmail → POST /api/billing/manual-credit
 *
 * УСТАНОВКА (один раз):
 * 1. Расширения → Apps Script → новый проект, вставь этот файл.
 * 2. Project Settings → Script properties:
 *    - API_URL          = https://ТВОЙ-ХОСТ/api/billing/manual-credit   (полный URL endpoint)
 *    - WEBHOOK_SECRET   = тот же, что MANUAL_BILLING_WEBHOOK_SECRET на Railway
 *    - GMAIL_SEARCH     = (опционально) запрос Gmail, например:
 *        from:payments@посредник.com subject:"Payment received"
 *      или оставь пустым — тогда используется DEFAULT_GMAIL_SEARCH ниже.
 * 3. Triggers (часы) → Add trigger → processPaymentEmails → Time-driven → каждые 5–15 минут.
 * 4. Первый запуск: авторизуй доступ к Gmail и к внешним URL (UrlFetchApp).
 *
 * ПАРСИНГ ПИСЬМА:
 * - Если тело письма — один JSON-объект с полями email, external_payment_id, credits — он используется как есть.
 * - Иначе используются REGEX ниже (подстрой под реальное письмо от посредника).
 *
 * ДУБЛИ: бэкенд идемпотентен по external_payment_id; письма помечаются лейблом PROCESSED_LABEL.
 */

var DEFAULT_GMAIL_SEARCH =
  'newer_than:1d in:inbox -label:vt-manual-payment-done'; // подставь свой фильтр

var PROCESSED_LABEL = 'vt-manual-payment-done';

/** Максимум писем за один запуск (квота Apps Script). */
var MAX_THREADS = 15;

/**
 * Точка входа для триггера по расписанию.
 */
function processPaymentEmails() {
  var props = PropertiesService.getScriptProperties();
  var apiUrl = props.getProperty('API_URL');
  var secret = props.getProperty('WEBHOOK_SECRET');
  if (!apiUrl || !secret) {
    throw new Error('Заполни Script properties: API_URL и WEBHOOK_SECRET');
  }

  var search = props.getProperty('GMAIL_SEARCH') || DEFAULT_GMAIL_SEARCH;
  var label = getOrCreateLabel_(PROCESSED_LABEL);
  var threads = GmailApp.search(search, 0, MAX_THREADS);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    if (thread.getLabels().some(function (l) { return l.getName() === PROCESSED_LABEL; })) {
      continue;
    }

    var messages = thread.getMessages();
    var last = messages[messages.length - 1];
    var body = last.getPlainBody() || last.getBody() || '';
    var parsed = parsePaymentEmail_(body, last.getSubject());

    if (!parsed) {
      Logger.log('Пропуск (не разобрали): thread id=' + thread.getId());
      continue;
    }

    var payload = {
      email: parsed.email,
      external_payment_id: parsed.external_payment_id,
      credits: parsed.credits,
      source: 'google_apps_script_gmail',
      plan_code: parsed.plan_code || undefined,
    };

    var result = postManualCredit_(apiUrl, secret, payload);
    Logger.log('POST result: ' + result);

    thread.addLabel(label);
  }
}

/**
 * Ручной прогон из редактора (Run → processPaymentEmailsOnce).
 */
function processPaymentEmailsOnce() {
  processPaymentEmails();
}

// Если скрипт привязан к Google Таблице, можно добавить onOpen() с меню
// и вызовом processPaymentEmailsOnce — в standalone-проекте SpreadsheetApp недоступен.

// --- internals ---

function getOrCreateLabel_(name) {
  var labels = GmailApp.getUserLabels();
  for (var i = 0; i < labels.length; i++) {
    if (labels[i].getName() === name) return labels[i];
  }
  return GmailApp.createLabel(name);
}

/**
 * @returns {{email:string,external_payment_id:string,credits:number,plan_code?:string}|null}
 */
function parsePaymentEmail_(body, subject) {
  body = (body || '').trim();

  // 1) Целиком JSON в теле
  if (body.indexOf('{') === 0) {
    try {
      var j = JSON.parse(body);
      if (j.email && j.external_payment_id && j.credits) {
        return {
          email: String(j.email).trim().toLowerCase(),
          external_payment_id: String(j.external_payment_id).trim(),
          credits: parseInt(j.credits, 10),
          plan_code: j.plan_code ? String(j.plan_code) : undefined,
        };
      }
    } catch (e) {
      // не JSON — идём в regex
    }
  }

  // 2) Шаблонные строки (ПОДСТАВЬ ПОД СВОЁ ПИСЬМО — примеры)
  var emailMatch = body.match(/(?:buyer|customer|payer|email)\s*[:#]\s*([^\s<>]+@[^\s<>]+)/i);
  var idMatch = body.match(/(?:payment|transaction|order)\s*id\s*[:#]\s*([A-Za-z0-9_\-]+)/i);
  var creditsMatch = body.match(/(?:credits|pack)\s*[:#]\s*(\d+)/i);

  if (!emailMatch || !idMatch || !creditsMatch) {
    // fallback: одна строка "email | id | credits"
    var pipe = body.match(/([^\s|]+@[^\s|]+)\s*\|\s*([A-Za-z0-9_\-]+)\s*\|\s*(\d+)/);
    if (pipe) {
      return {
        email: pipe[1].trim().toLowerCase(),
        external_payment_id: pipe[2].trim(),
        credits: parseInt(pipe[3], 10),
      };
    }
    return null;
  }

  var credits = parseInt(creditsMatch[1], 10);
  if (isNaN(credits) || credits < 1) return null;

  return {
    email: emailMatch[1].trim().toLowerCase(),
    external_payment_id: idMatch[1].trim(),
    credits: credits,
  };
}

function postManualCredit_(apiUrl, secret, payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'X-Manual-Billing-Secret': secret,
    },
    payload: JSON.stringify(payload),
  };

  var resp = UrlFetchApp.fetch(apiUrl, options);
  var code = resp.getResponseCode();
  var text = resp.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('HTTP ' + code + ' ' + text);
  }
  return text;
}
