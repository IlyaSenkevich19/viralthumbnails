export function normalizeHttpUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * Accepts common YouTube URLs (channel, @handle, /c/, /user/, watch, shorts, youtu.be).
 */
export function isLikelyYoutubeUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'youtu.be') {
      return u.pathname.length > 1;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
