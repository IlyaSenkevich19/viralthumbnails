'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNewProject } from '@/contexts/new-project-context';
import { useProjectsList } from '@/lib/hooks';
import { formatRelativeTime, humanizeKey, isLikelyYoutubeUrl } from '@/lib/format';
import { projectStatusLabel, statusToneClass } from '@/lib/status-tone';
import { isOptimisticProjectId } from '@/lib/types/project';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AppRoutes, AppSearchParams, projectVariantsPath } from '@/config/routes';

function DashboardOpenNewProjectFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openNewProject } = useNewProject();

  useEffect(() => {
    if (searchParams.get(AppSearchParams.openNewProject) !== '1') return;
    const q: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k !== AppSearchParams.openNewProject) q[k] = v;
    });
    openNewProject(q);
    router.replace(AppRoutes.dashboard);
  }, [searchParams, openNewProject, router]);

  return null;
}

function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="space-y-2 pb-2 pt-3">
        <Skeleton className="h-4 w-[80%] max-w-full" />
        <Skeleton className="h-3 w-1/3" />
      </CardHeader>
    </Card>
  );
}

export function DashboardClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { openNewProject } = useNewProject();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
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
    setUrlError('');
    openNewProject(extra ?? {});
  }

  function handleCreateFromYoutubeField() {
    const trimmed = url.trim();
    if (!trimmed) {
      goCreate();
      return;
    }
    if (!isLikelyYoutubeUrl(trimmed)) {
      setUrlError('Paste a full YouTube link (youtube.com or youtu.be).');
      return;
    }
    setUrlError('');
    goCreate({ youtube_url: trimmed });
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <DashboardOpenNewProjectFromUrl />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create thumbnails from a YouTube link, upload, script, or text — then review variants.
          </p>
        </div>
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
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError('');
                }}
                inputMode="url"
                autoComplete="url"
                aria-invalid={Boolean(urlError)}
                aria-describedby={urlError ? 'dash-youtube-url-error' : undefined}
              />
              {urlError ? (
                <p id="dash-youtube-url-error" className="text-sm text-destructive" role="alert">
                  {urlError}
                </p>
              ) : null}
            </div>
            <Button type="button" className="shrink-0" onClick={handleCreateFromYoutubeField}>
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
          <Link href={AppRoutes.projects} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
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
            {projects.slice(0, 6).map((p) => {
              const optimistic = isOptimisticProjectId(p.id);
              const card = (
                <Card
                  className={cn(
                    'h-full overflow-hidden transition-colors',
                    !optimistic && 'hover:border-border-hover',
                  )}
                >
                  <div
                    className={cn(
                      'relative aspect-video bg-muted',
                      p.status === 'generating' && 'motion-safe:animate-pulse',
                    )}
                  >
                    {p.cover_thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_thumbnail_url}
                        alt={`Thumbnail preview for ${p.title}`}
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
                        className={cn('shrink-0', statusToneClass(p.status))}
                        aria-label={`Status: ${projectStatusLabel(p.status)}`}
                      >
                        {projectStatusLabel(p.status)}
                      </Badge>
                    </div>
                    <p className="text-left text-xs text-muted-foreground capitalize">{p.platform}</p>
                    <p className="text-left text-[11px] text-muted-foreground/80">
                      {humanizeKey(p.source_type)}
                      {p.updated_at ? (
                        <>
                          {' '}
                          · <span className="tabular-nums">{formatRelativeTime(p.updated_at)}</span>
                        </>
                      ) : null}
                    </p>
                  </CardHeader>
                </Card>
              );
              return optimistic ? (
                <div key={p.id} className="rounded-xl outline-none">
                  {card}
                </div>
              ) : (
                <Link
                  key={p.id}
                  href={projectVariantsPath(p.id)}
                  className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
