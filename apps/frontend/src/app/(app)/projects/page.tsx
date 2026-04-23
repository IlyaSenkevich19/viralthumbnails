'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FolderOpen, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  useProjectsList,
  useDeleteProjectMutation,
  usePipelineJobSurface,
  useCreateEmptyProjectMutation,
} from '@/lib/hooks';
import { AppRoutes, projectVariantsPath } from '@/config/routes';
import { formatRelativeTime, humanizeKey } from '@/lib/format';
import { projectStatusLabel, statusToneClass } from '@/lib/status-tone';
import { isOptimisticProjectId } from '@/lib/types/project';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { ProjectRowMenu } from '@/components/projects/project-row-menu';
import { SetPageFrame } from '@/components/layout/set-page-frame';

export default function ProjectsListPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { data: projects = [], isPending, isError, error } = useProjectsList();
  const deleteProject = useDeleteProjectMutation();
  const createEmptyProject = useCreateEmptyProjectMutation();
  const pipelineSurface = usePipelineJobSurface();

  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(
    null,
  );

  const hasSession = Boolean(user?.id && accessToken);
  const showSkeleton = authLoading || (hasSession && isPending);
  const listError =
    !authLoading && !hasSession
      ? 'Session not available. Try refreshing the page.'
      : isError
        ? (error as Error).message
        : null;

  function openProject(p: { id: string }) {
    if (isOptimisticProjectId(p.id)) return;
    router.push(projectVariantsPath(p.id));
  }

  function prefetchProjectVariants(p: { id: string }) {
    if (isOptimisticProjectId(p.id)) return;
    void router.prefetch(projectVariantsPath(p.id));
  }

  return (
    <div className="space-y-6">
      <SetPageFrame title="Projects" />
      {pipelineSurface.active && pipelineSurface.label ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          <span>
            {pipelineSurface.label}. The new project will appear here when the run finishes.
          </span>
        </div>
      ) : null}
      <ConfirmationModal
        open={projectToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
        title="Delete project?"
        description={
          projectToDelete
            ? `“${projectToDelete.title}” and all its generated images will be removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (!projectToDelete) return;
          const { id } = projectToDelete;
          setProjectToDelete(null);
          deleteProject.mutate(id);
        }}
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          className="inline-flex h-10 gap-2"
          disabled={!hasSession || createEmptyProject.isPending}
          onClick={() => createEmptyProject.mutate()}
        >
          {createEmptyProject.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          New project
        </Button>
      </div>

      {listError && (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      )}
      {showSkeleton ? (
        <div className="surface overflow-hidden">
          <div className="divide-y divide-border bg-card">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-12 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="hidden h-8 w-8 shrink-0 rounded-md sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:py-16">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"
              aria-hidden
            >
              <FolderOpen className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold tracking-tight text-foreground">No projects yet</p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                Create a project, then pick a template and face and generate thumbnails on the next screen. For a
                one-step run from a prompt, YouTube link, or video, use the{' '}
                <Link href={AppRoutes.create} className="font-medium text-primary underline-offset-2 hover:underline">
                  Create
                </Link>
                .
              </p>
            </div>
            <Button
              type="button"
              className={buttonVariants()}
              disabled={!hasSession || createEmptyProject.isPending}
              onClick={() => createEmptyProject.mutate()}
            >
              {createEmptyProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              New project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="surface hidden overflow-x-auto md:block">
            <table className="w-full min-w-[min(100%,720px)] text-left text-sm">
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
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {projects.map((p) => {
                  const optimistic = isOptimisticProjectId(p.id);
                  return (
                    <tr
                      key={p.id}
                      tabIndex={optimistic ? -1 : 0}
                      className={cn(
                        'motion-base hover:bg-secondary/50',
                        !optimistic && 'cursor-pointer focus-visible:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      )}
                      onMouseEnter={() => prefetchProjectVariants(p)}
                      onFocus={() => prefetchProjectVariants(p)}
                      onClick={() => openProject(p)}
                      onKeyDown={(e) => {
                        if (optimistic) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openProject(p);
                        }
                      }}
                    >
                      <td className="px-4 py-2">
                        <div className="h-12 w-20 overflow-hidden rounded-md bg-muted">
                          {p.cover_thumbnail_url ? (
                            <div className="relative h-full w-full">
                              <Image
                                src={p.cover_thumbnail_url}
                                alt={`Preview: ${p.title}`}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <th scope="row" className="px-4 py-2 text-left font-medium text-foreground">
                        {p.title}
                      </th>
                      <td className="px-4 py-2 capitalize text-muted-foreground">{p.platform}</td>
                      <td className="px-4 py-2 text-muted-foreground">{humanizeKey(p.source_type)}</td>
                      <td className="px-4 py-2">
                        <Badge variant="default" className={cn(statusToneClass(p.status))}>
                          {projectStatusLabel(p.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {formatRelativeTime(p.updated_at)}
                      </td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        {optimistic ? (
                          <span className="text-xs text-muted-foreground">Creating…</span>
                        ) : (
                          <ProjectRowMenu
                            projectId={p.id}
                            projectTitle={p.title}
                            onDeleteClick={() => setProjectToDelete({ id: p.id, title: p.title })}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {projects.map((p) => {
              const optimistic = isOptimisticProjectId(p.id);
              return (
                <Card
                  key={p.id}
                  role={optimistic ? undefined : 'button'}
                  tabIndex={optimistic ? -1 : 0}
                  className={cn(
                    'overflow-hidden',
                    !optimistic &&
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  onMouseEnter={() => prefetchProjectVariants(p)}
                  onFocus={() => prefetchProjectVariants(p)}
                  onClick={() => openProject(p)}
                  onKeyDown={(e) => {
                    if (optimistic) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openProject(p);
                    }
                  }}
                >
                  <CardContent className="flex gap-3 p-4">
                    <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.cover_thumbnail_url ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={p.cover_thumbnail_url}
                            alt={`Preview: ${p.title}`}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-medium text-foreground">{p.title}</p>
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                          {optimistic ? (
                            <span className="text-xs text-muted-foreground">Creating…</span>
                          ) : (
                            <ProjectRowMenu
                              projectId={p.id}
                              projectTitle={p.title}
                              onDeleteClick={() => setProjectToDelete({ id: p.id, title: p.title })}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{p.platform}</span>
                        <span aria-hidden>·</span>
                        <span>{humanizeKey(p.source_type)}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{formatRelativeTime(p.updated_at)}</span>
                      </div>
                      <Badge variant="default" className={cn('w-fit', statusToneClass(p.status))}>
                        {projectStatusLabel(p.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
