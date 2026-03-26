'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import type { ProjectWithVariants } from '@/lib/types/project';
import { humanizeKey } from '@/lib/format';
import { statusToneClass } from '@/lib/status-tone';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function VariantCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="flex justify-between gap-2 p-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}

export function VariantsGallery({ projectId }: { projectId: string }) {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ProjectWithVariants | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    const res = await projectsApi.getProject(accessToken, projectId);
    setData(res);
  }, [accessToken, projectId]);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setLoading(false);
      setError('You need to be signed in to view this project.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, projectId, authLoading, load]);

  async function handleRefresh() {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      await load();
      toast.success('Updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div>
          <Skeleton className="mb-2 h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <VariantCardSkeleton />
          <VariantCardSkeleton />
          <VariantCardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <p className="text-sm text-destructive" role="alert">
          {error ?? 'Project not found'}
        </p>
      </div>
    );
  }

  const variants = data.thumbnail_variants ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{data.title}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{data.platform}</span>
          <span aria-hidden> · </span>
          {humanizeKey(data.source_type)}
        </p>
      </div>

      {variants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No variants yet.{' '}
            <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">
              Start from the dashboard
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {v.generated_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.generated_image_url}
                    alt={`Thumbnail variant for ${data.title}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted-foreground">
                    {v.status === 'failed' ? (
                      <span>{v.error_message ?? 'Generation failed'}</span>
                    ) : (
                      <span>No image yet</span>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <Badge variant="default" className={cn('w-fit capitalize', statusToneClass(v.status))}>
                  {v.status}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={!v.generated_image_url}
                    onClick={() => toast.message('Edit flow coming soon')}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                  {v.generated_image_url ? (
                    <>
                      <a
                        href={v.generated_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'inline-flex gap-1',
                        )}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Open
                      </a>
                      <a
                        href={v.generated_image_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'inline-flex gap-1',
                        )}
                        title="May open in a new tab if the host blocks download"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        Download
                      </a>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled className="gap-1">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
