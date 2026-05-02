'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Video } from 'lucide-react';
import { useYoutubeInspiration } from '@/lib/hooks';
import { YOUTUBE_INSPIRATION_NICHES } from '@/lib/youtube/niche-queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VtPillToggleRow } from '@/components/motion/vt-pill-toggle-row';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { cn } from '@/lib/utils';

const NICHE_ALL = 'all';

const VIDEO_DURATION_OPTIONS = [
  { value: 'any', label: 'Any length' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
] as const;

/** Published-at filter for YouTube pills (VtPillToggleRow ids). */
const YT_PUBLISHED_ALL = 'all';
const YT_PUBLISHED_LAST2Y = 'last2y';

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

  const nichePillItems = useMemo(
    () => [
      { id: NICHE_ALL, label: 'Any niche' },
      ...YOUTUBE_INSPIRATION_NICHES.map((n) => ({ id: n.code, label: n.label })),
    ],
    [],
  );

  const durationPillItems = useMemo(
    () => VIDEO_DURATION_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
    [],
  );

  const publishedWindowPillItems = useMemo(
    () => [
      { id: YT_PUBLISHED_ALL, label: 'All time' },
      { id: YT_PUBLISHED_LAST2Y, label: 'Last 2 years' },
    ],
    [],
  );

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
        <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          Queries ride the YouTube Data API with plain view-count ordering—not CTR guesses. Refresh schedules one lookup per tracked niche while thumbnail sprites arrive via CDN payloads in the listing. Never ship keys client-side—store{' '}
          <code className="rounded bg-secondary px-1 text-xs">YOUTUBE_DATA_API_KEY</code> in{' '}
          <code className="rounded bg-secondary px-1 text-xs">apps/frontend/.env.local</code>.
        </p>
        {data?.disclaimer ? (
          <p className="mt-2 text-xs text-muted-foreground">{data.disclaimer}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Niche</span>
        <VtPillToggleRow
          className="min-w-0 flex-1"
          layoutId="vt-youtube-niche-pill"
          items={nichePillItems}
          selectedId={niche}
          onSelect={setNiche}
        />
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
          <VtPillToggleRow
            layoutId="vt-youtube-duration-pill"
            items={durationPillItems}
            selectedId={videoDuration}
            onSelect={(id) => {
              const opt = VIDEO_DURATION_OPTIONS.find((o) => o.value === id);
              if (opt) setVideoDuration(opt.value);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Published
          </span>
          <VtPillToggleRow
            layoutId="vt-youtube-published-pill"
            items={publishedWindowPillItems}
            selectedId={recentOnly ? YT_PUBLISHED_LAST2Y : YT_PUBLISHED_ALL}
            onSelect={(id) => setRecentOnly(id === YT_PUBLISHED_LAST2Y)}
          />
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
        <InlineLoadError
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && sortedItems.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-border/70 bg-muted/15 py-10"
          icon={<Video className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
          title="No videos for this filter"
          description="Try another niche, duration, or time window, then refresh."
        />
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
                  alt={v.title}
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
