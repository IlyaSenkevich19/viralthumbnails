/** Turn `youtube_url` → `youtube url` for UI labels. */
export function humanizeKey(s: string): string {
  return s.replace(/_/g, ' ');
}

const RT_CACHE = new Map<string, Intl.RelativeTimeFormat>();

function getRelativeTimeFormatter(locale: string): Intl.RelativeTimeFormat {
  let f = RT_CACHE.get(locale);
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    RT_CACHE.set(locale, f);
  }
  return f;
}

/** Past-oriented labels, e.g. "2 days ago" (locale default `en`). */
export function formatRelativeTime(iso: string, locale = 'en'): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = getRelativeTimeFormatter(locale);
  if (abs < 45) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 604800), 'week');
  return rtf.format(Math.round(diffSec / 2_592_000), 'month');
}

/** Accepts common YouTube URL shapes for dashboard paste validation. */
export function isLikelyYoutubeUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(withProto);
    const h = u.hostname.replace(/^www\./i, '').toLowerCase();
    return (
      h === 'youtube.com' ||
      h === 'youtu.be' ||
      h === 'm.youtube.com' ||
      h === 'music.youtube.com' ||
      h.endsWith('.youtube.com')
    );
  } catch {
    return false;
  }
}
