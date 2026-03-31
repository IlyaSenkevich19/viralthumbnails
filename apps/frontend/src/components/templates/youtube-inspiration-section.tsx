'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useYoutubeInspiration } from '@/lib/hooks';
import { YOUTUBE_INSPIRATION_NICHES } from '@/lib/youtube/niche-queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const NICHE_ALL = 'all';

const VIDEO_DURATION_OPTIONS = [
  { value: 'any', label: 'Any length' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
] as const;

function publishedAfterTwoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString();
}

export function YoutubeInspirationSection() {
  const [niche, setNiche] = useState<string>(NICHE_ALL);
  const [videoDuration, setVideoDuration] = useState<(typeof VIDEO_DURATION_OPTIONS)[number]['value']>(
    'medium',
  );
  const [recentOnly, setRecentOnly] = useState(false);
  const perNiche = 4;
  const publishedAfter = recentOnly ? publishedAfterTwoYearsAgo() : '';

  const { data, isPending, isError, error, refetch, isFetching } = useYoutubeInspiration({
    nicheCode: niche,
    perNiche,
    videoDuration,
    publishedAfter,
  });

  const sortedItems = useMemo(() => {
    const items = data?.items ?? [];
    if (niche !== NICHE_ALL) return items;
    return [...items].sort((a, b) => {
      const la = YOUTUBE_INSPIRATION_NICHES.findIndex((x) => x.code === a.nicheCode);
      const lb = YOUTUBE_INSPIRATION_NICHES.findIndex((x) => x.code === b.nicheCode);
      if (la !== lb) return la - lb;
      return a.title.localeCompare(b.title);
    });
  }, [data?.items, niche]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-muted/10 p-4 sm:p-6" aria-labelledby="yt-inspiration-heading">
      <div>
        <h2 id="yt-inspiration-heading" className="text-lg font-semibold tracking-tight text-foreground">
          YouTube inspiration
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live search via YouTube Data API (view count order — not CTR). Each refresh uses one search per niche;
          thumbnail images load from YouTube CDN and do not spend API quota. Key stays on the server (
          <code className="rounded bg-secondary px-1 text-xs">YOUTUBE_DATA_API_KEY</code> in{' '}
          <code className="rounded bg-secondary px-1 text-xs">apps/frontend/.env.local</code>).
        </p>
        {data?.disclaimer ? (
          <p className="mt-2 text-xs text-muted-foreground">{data.disclaimer}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Niche</span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={niche === NICHE_ALL ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setNiche(NICHE_ALL)}
          >
            All niches
          </Button>
          {YOUTUBE_INSPIRATION_NICHES.map((n) => (
            <Button
              key={n.code}
              type="button"
              size="sm"
              variant={niche === n.code ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setNiche(n.code)}
            >
              {n.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</span>
          <div className="flex flex-wrap gap-2">
            {VIDEO_DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={videoDuration === opt.value ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setVideoDuration(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={recentOnly ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setRecentOnly((v) => !v)}
          >
            Last 2 years
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: perNiche }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {(error as Error).message}
        </p>
      ) : null}

      {!isPending && !isError && sortedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No videos returned for this filter.</p>
      ) : null}

      {!isPending && !isError && sortedItems.length > 0 ? (
        <div
          className={cn(
            'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
            isFetching && 'opacity-70 transition-opacity',
          )}
        >
          {sortedItems.map((v) => (
            <Card key={`${v.nicheCode}-${v.videoId}`} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbMaxUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src !== v.thumbHighUrl) el.src = v.thumbHighUrl;
                  }}
                />
              </div>
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">{v.title}</CardTitle>
                  <Badge variant="glass" className="shrink-0 text-[10px]">
                    {v.nicheLabel}
                  </Badge>
                </div>
                {v.channelTitle ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">{v.channelTitle}</p>
                ) : null}
                <a
                  href={v.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline',
                  )}
                >
                  Open on YouTube
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
