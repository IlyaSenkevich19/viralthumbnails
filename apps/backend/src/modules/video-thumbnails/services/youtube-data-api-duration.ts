import { iso8601DurationToSeconds } from '../utils/iso8601-duration-to-seconds';

const YT_VIDEOS_API = 'https://www.googleapis.com/youtube/v3/videos';
const TIMEOUT_MS = 8000;

/**
 * `videos.list` `contentDetails.duration` for a single id. Returns `null` on failure or missing key.
 */
export async function fetchYoutubeDurationSecondsFromDataApi(
  videoId: string,
  apiKey: string,
): Promise<number | null> {
  const key = apiKey.trim();
  const id = videoId.trim();
  if (!key || !id) return null;

  const url = new URL(YT_VIDEOS_API);
  url.searchParams.set('part', 'contentDetails');
  url.searchParams.set('id', id);
  url.searchParams.set('key', key);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ contentDetails?: { duration?: string } }>;
    };
    const iso = json.items?.[0]?.contentDetails?.duration;
    if (typeof iso !== 'string' || !iso) return null;
    return iso8601DurationToSeconds(iso);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
