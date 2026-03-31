import { NextRequest, NextResponse } from 'next/server';
import { userIdIsAdmin } from '@/lib/admin';
import {
  YOUTUBE_INSPIRATION_NICHES,
  youtubeQueryForNiche,
} from '@/lib/youtube/niche-queries';
import type { YoutubeInspirationItem } from '@/lib/youtube/inspiration-types';
import { createClient } from '@/lib/supabase/server';

const YT_API = 'https://www.googleapis.com/youtube/v3';

/** YouTube `search.list` videoDuration filter (reduces Shorts / odd crops when medium|long). */
const VIDEO_DURATIONS = ['any', 'short', 'medium', 'long'] as const;
type VideoDuration = (typeof VIDEO_DURATIONS)[number];

export type { YoutubeInspirationItem };

function parseVideoDuration(raw: string | null): VideoDuration {
  const v = raw?.trim().toLowerCase() ?? '';
  return VIDEO_DURATIONS.includes(v as VideoDuration) ? (v as VideoDuration) : 'medium';
}

type YtSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
};

async function searchVideos(
  searchQuery: string,
  apiKey: string,
  maxResults: number,
  opts: { videoDuration: VideoDuration; publishedAfter?: string },
): Promise<YtSearchItem[]> {
  const u = new URL(`${YT_API}/search`);
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('type', 'video');
  u.searchParams.set('order', 'viewCount');
  u.searchParams.set('q', searchQuery);
  u.searchParams.set('maxResults', String(Math.min(50, Math.max(1, maxResults))));
  if (opts.videoDuration !== 'any') {
    u.searchParams.set('videoDuration', opts.videoDuration);
  }
  if (opts.publishedAfter?.trim()) {
    u.searchParams.set('publishedAfter', opts.publishedAfter.trim());
  }
  u.searchParams.set('key', apiKey);

  const res = await fetch(u.toString(), { next: { revalidate: 300 } });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 400);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) detail = j.error.message;
    } catch {
      /* keep */
    }
    throw new Error(`YouTube ${res.status}: ${detail}`);
  }
  const json = JSON.parse(text) as { items?: YtSearchItem[] };
  return json.items ?? [];
}

function toItem(
  raw: YtSearchItem,
  nicheCode: string,
  nicheLabel: string,
): YoutubeInspirationItem | null {
  const videoId = raw.id?.videoId;
  if (!videoId) return null;
  const title = raw.snippet?.title?.trim() || 'Video';
  const channelTitle = raw.snippet?.channelTitle?.trim() || '';
  const high = raw.snippet?.thumbnails?.high?.url ?? raw.snippet?.thumbnails?.medium?.url ?? '';
  return {
    videoId,
    title,
    channelTitle,
    nicheCode,
    nicheLabel,
    thumbMaxUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbHighUrl: high || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * GET ?niche=…&perNiche=4&videoDuration=medium|long|short|any&publishedAfter=RFC3339
 * One search.list ≈ 100 quota units. Images from i.ytimg.com are free (not Data API).
 * Requires signed-in user whose id is listed in `ADMIN_USER_IDS`.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!userIdIsAdmin(user?.id)) {
    return NextResponse.json(
      { error: 'forbidden', message: 'This endpoint is only available to admins.' },
      { status: 403 },
    );
  }

  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'missing_key',
        message:
          'Set YOUTUBE_DATA_API_KEY in apps/frontend/.env.local (YouTube Data API v3 key). Restart next dev.',
      },
      { status: 503 },
    );
  }

  const niche = req.nextUrl.searchParams.get('niche')?.trim() || 'all';
  const perNiche = Math.min(12, Math.max(1, parseInt(req.nextUrl.searchParams.get('perNiche') ?? '4', 10) || 4));
  const videoDuration = parseVideoDuration(req.nextUrl.searchParams.get('videoDuration'));
  const publishedAfterRaw = req.nextUrl.searchParams.get('publishedAfter')?.trim();
  const publishedAfter =
    publishedAfterRaw && /^\d{4}-\d{2}-\d{2}T/.test(publishedAfterRaw) ? publishedAfterRaw : undefined;

  const searchOpts = { videoDuration, publishedAfter };

  try {
    const items: YoutubeInspirationItem[] = [];
    const seen = new Set<string>();

    if (niche === 'all') {
      for (const n of YOUTUBE_INSPIRATION_NICHES) {
        const rows = await searchVideos(n.query, apiKey, perNiche, searchOpts);
        for (const r of rows) {
          const it = toItem(r, n.code, n.label);
          if (!it || seen.has(it.videoId)) continue;
          seen.add(it.videoId);
          items.push(it);
        }
      }
    } else {
      const q = youtubeQueryForNiche(niche);
      if (!q) {
        return NextResponse.json({ error: 'unknown_niche', message: niche }, { status: 400 });
      }
      const meta = YOUTUBE_INSPIRATION_NICHES.find((x) => x.code === niche);
      const label = meta?.label ?? niche;
      const rows = await searchVideos(q, apiKey, Math.min(50, perNiche + 4), searchOpts);
      for (const r of rows) {
        const it = toItem(r, niche, label);
        if (!it || seen.has(it.videoId)) continue;
        seen.add(it.videoId);
        items.push(it);
        if (items.length >= perNiche) break;
      }
    }

    return NextResponse.json({
      items,
      disclaimer:
        'Sorted by view count; duration filter biases toward longer uploads. Not CTR. Thumbnail JPEGs do not use Data API quota.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'YouTube request failed';
    return NextResponse.json({ error: 'youtube_failed', message: msg }, { status: 502 });
  }
}
