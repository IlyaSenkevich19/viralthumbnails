'use client';

import { Suspense, useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { FolderOpen, Loader2, Plus, Search as SearchIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  PROJECTS_PAGE_SIZE_OPTIONS,
  useProjectsListRoute,
  useProjectsList,
  usePrefetchAdjacentProjects,
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { ProjectRowMenu } from '@/components/projects/project-row-menu';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { TemplatesPagination } from '@/components/templates/templates-pagination';
import { vtSpring, vtStagger } from '@/lib/motion-presets';

function ProjectsPageSuspenseFallback() {
  return (
    <div className="space-y-6">
      <SetPageFrame title="Projects" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-[9.5rem] rounded-xl" />
      </div>
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
    </div>
  );
}

function ProjectsPageContent() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { page, limit, qFromUrl, draftQ, setDraftQ, searchDirty, setPage, setLimit, clearSearch } =
    useProjectsListRoute();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    isPlaceholderData,
    refetch,
  } = useProjectsList(page, limit, qFromUrl);
  const projects = data?.items ?? [];
  const total = data?.total ?? 0;
  const limitFromApi = data?.limit ?? limit;
  const paginationBusy = isFetching && Boolean(isPlaceholderData);

  usePrefetchAdjacentProjects(page, limit, qFromUrl, data?.total);

  const deleteProject = useDeleteProjectMutation();
  const createEmptyProject = useCreateEmptyProjectMutation();
  const pipelineSurface = usePipelineJobSurface();

  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);

  const hasSession = Boolean(user?.id && accessToken);
  const showSkeleton = authLoading || (hasSession && isPending);
  const listBusy = hasSession && (showSkeleton || paginationBusy);
  const listError =
    !authLoading && !hasSession
      ? 'Session not available. Try refreshing the page.'
      : isError
        ? (error as Error).message
        : null;

  const openProject = useCallback(
    (p: { id: string }) => {
      if (isOptimisticProjectId(p.id)) return;
      router.push(projectVariantsPath(p.id));
    },
    [router],
  );

  const prefetchProjectVariants = useCallback((p: { id: string }) => {
    if (isOptimisticProjectId(p.id)) return;
    void router.prefetch(projectVariantsPath(p.id));
  }, [router]);

  const rowListVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : vtStagger.card,
        delayChildren: reduceMotion ? 0 : 0.02,
      },
    },
  };

  const rowItemVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: vtSpring.reveal },
      };

  const listMotionKey = `${page}-${limitFromApi}-${qFromUrl ?? ''}`;

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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="projects-search" className="sr-only">
            Search projects by title
          </label>
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="projects-search"
            type="search"
            enterKeyHint="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                clearSearch();
              }
            }}
            placeholder="Search by title..."
            autoComplete="off"
            disabled={!hasSession}
            className={cn(
              'h-10 rounded-xl pl-10 pr-10',
              (draftQ.length > 0 || searchDirty) && 'pr-[4.75rem]',
              searchDirty ? 'motion-safe:border-primary/35' : null,
            )}
            aria-busy={searchDirty}
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
            {searchDirty ? (
              <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground" aria-hidden>
                <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              </span>
            ) : null}
            {!searchDirty && draftQ.length > 0 ? (
              <button
                type="button"
                onClick={() => clearSearch()}
                className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          className="inline-flex h-10 shrink-0 gap-2 sm:ml-auto"
          disabled={!hasSession || createEmptyProject.isPending}
          onClick={() => createEmptyProject.mutate()}
        >
          {createEmptyProject.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Create project
        </Button>
      </div>

      {listError ? (
        <InlineLoadError
          message={listError}
          onRetry={hasSession ? () => void refetch() : undefined}
        />
      ) : null}
      <section aria-label="Project list results" aria-busy={Boolean(listBusy && hasSession)}>
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
        ) : total === 0 && !qFromUrl ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={<FolderOpen className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
                title="No projects yet"
                description={
                  <>
                    Name a workspace, attach template and optional face references, then generate thumbnails in the
                    studio. For a shortcut from prompt, URL, or upload, jump to{' '}
                    <Link href={AppRoutes.create} className="font-medium text-primary underline-offset-2 hover:underline">
                      Generate thumbnails
                    </Link>
                    .
                  </>
                }
              >
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
                  Create project
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : total === 0 && qFromUrl ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={<SearchIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
                title="No matching projects"
                description={
                  <>
                    Nothing matched &quot;{qFromUrl}&quot;. Try another keyword or{' '}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => clearSearch()}
                    >
                      clear search
                    </button>
                    .
                  </>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              'space-y-4',
              paginationBusy && 'motion-safe:transition-opacity motion-safe:duration-200',
              paginationBusy && 'opacity-[0.92]',
            )}
          >
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
                <motion.tbody
                  key={listMotionKey}
                  className="divide-y divide-border bg-background"
                  initial="hidden"
                  animate="visible"
                  variants={rowListVariants}
                >
                  {projects.map((p) => {
                    const optimistic = isOptimisticProjectId(p.id);
                    return (
                      <motion.tr
                        key={p.id}
                        variants={rowItemVariants}
                        tabIndex={optimistic ? -1 : 0}
                        className={cn(
                          'motion-base hover:bg-secondary/50',
                          !optimistic &&
                            'cursor-pointer focus-visible:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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
                          <span className="line-clamp-1">{p.title}</span>
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            <span className="capitalize">{p.platform}</span>
                            <span aria-hidden> · </span>
                            <span>{humanizeKey(p.source_type)}</span>
                          </span>
                        </th>
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
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>

            <motion.div
              key={listMotionKey}
              className="space-y-3 md:hidden"
              initial="hidden"
              animate="visible"
              variants={rowListVariants}
            >
              {projects.map((p) => {
                const optimistic = isOptimisticProjectId(p.id);
                return (
                  <motion.div key={p.id} variants={rowItemVariants} className="min-w-0">
                    <Card
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
                  </motion.div>
                );
              })}
            </motion.div>

            {projects.length === 0 && total > 0 ? (
              <p className="text-center text-sm text-muted-foreground">No projects on this page.</p>
            ) : null}

            {total > 0 ? (
              <TemplatesPagination
                page={page}
                total={total}
                limit={limitFromApi}
                onPageChange={setPage}
                pageSizeOptions={PROJECTS_PAGE_SIZE_OPTIONS}
                onPageSizeChange={setLimit}
                isNavBusy={paginationBusy}
                emptySummaryLabel="No projects"
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProjectsListPage() {
  return (
    <Suspense fallback={<ProjectsPageSuspenseFallback />}>
      <ProjectsPageContent />
    </Suspense>
  );
}
