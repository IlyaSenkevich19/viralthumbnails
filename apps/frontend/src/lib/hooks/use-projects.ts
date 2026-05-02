'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { projectVariantsPath } from '@/config/routes';
import { projectsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type {
  PaginatedProjectsResponse,
  ProjectRow,
  ProjectSourceType,
  ProjectWithVariants,
  ThumbnailVariantRow,
} from '@/lib/types/project';
import { toast } from 'sonner';
import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';
import { handleBillingMutationError } from '@/lib/paywall-notify';
import { trackEvent } from '@/lib/analytics';

export const createProjectAndGenerateMutationKey = ['projects', 'create-and-generate'] as const;
export const createEmptyProjectMutationKey = ['projects', 'create-empty'] as const;

const PROJECTS_LIST_STALE_MS = 45_000;

export function useProjectsList(page: number, limit: number, q: string) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
  const qKey = q.trim();

  return useQuery({
    queryKey: queryKeys.projects.list(userId ?? '__pending__', safePage, limit, qKey),
    queryFn: () =>
      projectsApi.listProjects(accessToken!, {
        page: safePage,
        limit,
        q: qKey || undefined,
      }),
    enabled: !authLoading && Boolean(userId && accessToken),
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery?.queryKey || previousQuery.queryKey.length < 6) {
        return undefined;
      }
      const key = previousQuery.queryKey;
      const prevUser = String(key[2]);
      const prevPage = Number(key[3]);
      const prevLimit = Number(key[4]);
      const prevQ = String(key[5] ?? '');
      if (
        prevUser !== (userId ?? '__pending__') ||
        prevPage !== safePage ||
        prevLimit !== limit ||
        prevQ !== qKey
      ) {
        return undefined;
      }
      return previousData as PaginatedProjectsResponse;
    },
    staleTime: PROJECTS_LIST_STALE_MS,
  });
}

/** Prefetch previous/next list page while user paginates or searches (warm cache). */
export function usePrefetchAdjacentProjects(page: number, limit: number, q: string, total: number | undefined) {
  const queryClient = useQueryClient();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1;
  const qKey = q.trim();

  useEffect(() => {
    if (authLoading || !userId || !accessToken || total == null || total <= 0) return;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const prefetch = (p: number) => {
      if (p < 1 || p > totalPages) return;
      void queryClient.prefetchQuery({
        queryKey: queryKeys.projects.list(userId, p, limit, qKey),
        queryFn: () =>
          projectsApi.listProjects(accessToken, {
            page: p,
            limit,
            q: qKey || undefined,
          }),
        staleTime: PROJECTS_LIST_STALE_MS,
      });
    };
    prefetch(safePage + 1);
    prefetch(safePage - 1);
  }, [accessToken, authLoading, limit, queryClient, qKey, safePage, total, userId]);
}

export function useProjectWithVariants(projectId: string) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.projects.detail(userId ?? '__pending__', projectId),
    queryFn: () => projectsApi.getProject(accessToken!, projectId),
    enabled: !authLoading && Boolean(userId && accessToken && projectId),
  });
}

type CreateBody = {
  title?: string;
  platform?: string;
  source_type: ProjectSourceType;
  source_data: Record<string, unknown>;
};

/** Create project then run variant generation (same flow as dashboard hero + modal). */
export type CreateProjectAndGenerateInput = CreateBody & {
  generate?: {
    template_id?: string;
    avatar_id?: string;
    prioritize_face?: boolean;
    count?: number;
  };
};

export function useCreateProjectAndGenerateMutation() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationKey: createProjectAndGenerateMutationKey,
    mutationFn: async (input: CreateProjectAndGenerateInput) => {
      if (!accessToken) throw new Error('Not signed in');
      if (!userId) throw new Error('Not signed in');
      const { generate, ...body } = input;
      const project = await projectsApi.createProject(accessToken, body);
      trackEvent('project_created', {
        project_id: project.id,
        source_type: body.source_type,
        has_generate_options: Boolean(generate),
      });
      try {
        const gen = await projectsApi.generateThumbnails(accessToken, project.id, {
          count: generate?.count ?? DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          template_id: generate?.template_id,
          avatar_id: generate?.avatar_id,
          prioritize_face: generate?.prioritize_face,
        });
        return { project, gen };
      } catch (err) {
        try {
          await projectsApi.deleteProject(accessToken, project.id);
        } catch {
          /* ignore */
        }
        throw err;
      }
    },
    onError: (err, _body, _context) => {
      if (handleBillingMutationError(err)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not create project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
      }
    },
  });
}

export function useCreateEmptyProjectMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationKey: createEmptyProjectMutationKey,
    mutationFn: async () => {
      if (!accessToken) throw new Error('Not signed in');
      return projectsApi.createProject(accessToken, {
        source_type: 'text',
        source_data: { text: '' },
      });
    },
    onSuccess: (project) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.listsForUser(userId) });
      }
      router.push(projectVariantsPath(project.id));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create project');
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!accessToken) throw new Error('Not signed in');
      await projectsApi.deleteProject(accessToken, projectId);
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() });
      const previousEntries = queryClient.getQueriesData<PaginatedProjectsResponse>({
        queryKey: queryKeys.projects.listsForUser(userId),
      });

      queryClient.setQueriesData<PaginatedProjectsResponse>(
        { queryKey: queryKeys.projects.listsForUser(userId) },
        (old) => {
          if (!old) return old;
          const had = old.items.some((p) => p.id === projectId);
          if (!had) return old;
          return {
            ...old,
            items: old.items.filter((p) => p.id !== projectId),
            total: Math.max(0, old.total - 1),
          };
        },
      );

      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(userId, projectId) });
      return { previousEntries };
    },
    onError: (err, _projectId, context) => {
      if (context?.previousEntries) {
        for (const [key, data] of context.previousEntries) {
          if (data !== undefined) queryClient.setQueryData(key, data);
        }
      }
      toast.error(err instanceof Error ? err.message : 'Could not delete project');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useGenerateThumbnailsMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (opts: {
      template_id?: string;
      avatar_id?: string;
      prioritize_face?: boolean;
      count?: number;
      face_in_thumbnail?: 'default' | 'with_face' | 'faceless';
    }) => {
      if (!accessToken) throw new Error('Not signed in');
      return projectsApi.generateThumbnails(accessToken, projectId, opts);
    },
    onSuccess: (res, opts) => {
      trackEvent('generation_started', {
        project_id: projectId,
        job_id: res.job_id,
        count: opts.count ?? 1,
        has_template: Boolean(opts.template_id),
        has_avatar: Boolean(opts.avatar_id),
        prioritize_face: Boolean(opts.prioritize_face),
        face_in_thumbnail: opts.face_in_thumbnail ?? 'default',
      });
      if (userId) {
        const detailKey = queryKeys.projects.detail(userId, projectId);
        queryClient.setQueryData<ProjectWithVariants | undefined>(detailKey, (current) => {
          if (!current) return current;
          return {
            ...current,
            status: 'generating',
            source_data: {
              ...(current.source_data ?? {}),
              pipeline_job_id: res.job_id,
            },
          };
        });
      }
      toast.success('Generation started');
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      if (handleBillingMutationError(err)) return;
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
      }
    },
  });
}

export function useRefineThumbnailMutation(
  projectId: string,
  onSuccessVariant?: (variant: ThumbnailVariantRow) => void,
) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (input: {
      variantId: string;
      instruction: string;
      template_id?: string;
      avatar_id?: string;
    }) => {
      if (!accessToken) throw new Error('Not signed in');
      return projectsApi.refineThumbnailVariant(accessToken, projectId, input.variantId, {
        instruction: input.instruction.trim(),
        template_id: input.template_id?.trim() || undefined,
        avatar_id: input.avatar_id?.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      trackEvent('thumbnail_refined', {
        project_id: projectId,
        variant_id: data.variant.id,
      });
      onSuccessVariant?.(data.variant);
      toast.success('Updated thumbnail saved as a new version');
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(userId, projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.listsForUser(userId) });
      }
    },
    onError: (err) => {
      if (handleBillingMutationError(err)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not refine thumbnail');
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
      }
    },
  });
}

export function useDeleteVariantMutation(projectId: string) {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id ?? '__pending__';

  return useMutation({
    mutationFn: async (variantId: string) => {
      if (!accessToken) throw new Error('Not signed in');
      await projectsApi.deleteVariant(accessToken, projectId, variantId);
    },
    onMutate: async (variantId) => {
      const detailKey = queryKeys.projects.detail(userId, projectId);
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ProjectWithVariants>(detailKey);
      if (previous) {
        queryClient.setQueryData<ProjectWithVariants>(detailKey, {
          ...previous,
          thumbnail_variants: previous.thumbnail_variants.filter((v) => v.id !== variantId),
        });
      }
      return { previous, detailKey };
    },
    onError: (err, _variantId, context) => {
      if (context?.previous !== undefined && context.detailKey) {
        queryClient.setQueryData(context.detailKey, context.previous);
      }
      toast.error(err instanceof Error ? err.message : 'Could not delete image');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
