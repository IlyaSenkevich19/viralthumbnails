'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useProjectsList } from '@/lib/hooks';
import { humanizeKey } from '@/lib/format';
import { statusToneClass } from '@/lib/status-tone';
import { BackendHealth } from '@/components/backend-health';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="space-y-2 pb-2 pt-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </CardHeader>
    </Card>
  );
}

export function DashboardClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const { data: projects = [], isPending, isError, error } = useProjectsList();

  const hasSession = Boolean(user?.id && accessToken);
  const showProjectSkeleton = authLoading || (hasSession && isPending);
  const listError =
    !authLoading && !hasSession
      ? 'Session not available. Try refreshing the page.'
      : isError
        ? (error as Error).message
        : null;

  function goCreate(extra?: Record<string, string>) {
    const q = new URLSearchParams(extra);
    router.push(`/projects/new${q.toString() ? `?${q}` : ''}`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create thumbnails from a YouTube link, upload, script, or text — then review variants.
          </p>
        </div>
        <BackendHealth />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Create new thumbnail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <label htmlFor="dash-youtube-url" className="text-sm font-medium text-foreground">
                Paste YouTube URL
              </label>
              <Input
                id="dash-youtube-url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoComplete="url"
              />
            </div>
            <Button
              type="button"
              className="shrink-0"
              onClick={() =>
                goCreate(url.trim() ? { youtube_url: url.trim() } : undefined)
              }
            >
              Create new thumbnail
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => goCreate({ tab: 'video' })}>
              Upload video
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => goCreate({ tab: 'script' })}>
              Upload script
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => goCreate({ tab: 'text' })}>
              Write text
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="my-projects-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="my-projects-heading" className="text-lg font-semibold tracking-tight text-foreground">
            My projects
          </h2>
          <Link href="/projects" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View all
          </Link>
        </div>
        {listError && (
          <p className="text-sm text-destructive" role="alert">
            Could not load projects. If tables are missing, run the Supabase migration. {listError}
          </p>
        )}
        {showProjectSkeleton ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-50" aria-hidden />
              <p>No projects yet. Start with “Create new thumbnail” above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}/variants`}
                className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full overflow-hidden transition-colors hover:border-border-hover">
                  <div className="relative aspect-video bg-muted">
                    {p.cover_thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 opacity-40" aria-hidden />
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-left text-sm font-semibold">
                        {p.title}
                      </CardTitle>
                      <Badge
                        variant="default"
                        className={cn('shrink-0 capitalize', statusToneClass(p.status))}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-left text-xs text-muted-foreground capitalize">{p.platform}</p>
                    <p className="text-left text-[11px] text-muted-foreground/80">
                      {humanizeKey(p.source_type)}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
