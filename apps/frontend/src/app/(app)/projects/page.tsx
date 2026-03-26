'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import type { ProjectRow } from '@/lib/types/project';
import { humanizeKey } from '@/lib/format';
import { statusToneClass } from '@/lib/status-tone';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ProjectsListPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setLoading(false);
      setError('Session not available. Try refreshing the page.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectsApi
      .listProjects(accessToken)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading]);

  const showSkeleton = authLoading || loading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">All thumbnail projects for your account.</p>
        </div>
        <Link
          href="/projects/new"
          className={cn(buttonVariants(), 'inline-flex gap-2')}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New project
        </Link>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {showSkeleton ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border bg-card">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-12 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="hidden h-8 w-16 sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground opacity-50" aria-hidden />
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            <Link href="/projects/new" className={buttonVariants()}>
              Create your first project
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full min-w-[min(100%,640px)] text-left text-sm">
            <thead className="border-b border-border bg-card text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Preview
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Platform
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {projects.map((p) => (
                <tr key={p.id} className="motion-base hover:bg-secondary/50">
                  <td className="px-4 py-2">
                    <div className="h-12 w-20 overflow-hidden rounded-md bg-muted">
                      {p.cover_thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.cover_thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <th scope="row" className="px-4 py-2 font-medium text-foreground">
                    {p.title}
                  </th>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{p.platform}</td>
                  <td className="px-4 py-2 text-muted-foreground">{humanizeKey(p.source_type)}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant="default"
                      className={cn('capitalize', statusToneClass(p.status))}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/projects/${p.id}/variants`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
