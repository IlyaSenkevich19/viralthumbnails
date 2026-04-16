/**
 * Parses YouTube `contentDetails.duration` ISO 8601 (e.g. `PT1H2M3S`, `PT45S`) to seconds.
 */
export function iso8601DurationToSeconds(iso: string): number | null {
  const s = iso?.trim();
  if (!s || !s.startsWith('PT')) return null;
  const match = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const h = match[1] ? Number.parseInt(match[1], 10) : 0;
  const m = match[2] ? Number.parseInt(match[2], 10) : 0;
  const sec = match[3] ? Number.parseInt(match[3], 10) : 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(sec)) return null;
  return h * 3600 + m * 60 + sec;
}
