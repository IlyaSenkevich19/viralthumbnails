'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { projectVariantsPath } from '@/config/routes';
import { projectsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ProjectRow, ProjectSourceType, ProjectWithVariants } from '@/lib/types/project';
import { toast } from 'sonner';
import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';
import { ApiError, isApiError } from '@/lib/api/api-error';
import { INITIAL_GENERATION_ALL_FAILED } from '@/lib/api/project-errors';
import { handleBillingMutationError } from '@/lib/paywall-notify';

export const createProjectAndGenerateMutationKey = ['projects', 'create-and-generate'] as const;
export const createEmptyProjectMutationKey = ['projects', 'create-empty'] as const;

export function useProjectsList() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.projects.list(userId ?? '__pending__'),
    queryFn: () => projectsApi.listProjects(accessToken!),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
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
      let removedAfterAllFailed = false;
      try {
        const gen = await projectsApi.generateThumbnails(accessToken, project.id, {
          count: generate?.count ?? DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          template_id: generate?.template_id,
          avatar_id: generate?.avatar_id,
          prioritize_face: generate?.prioritize_face,
        });
        const ok = gen.results.filter((r) => r.status === 'done').length;
        if (ok === 0) {
          try {
            await projectsApi.deleteProject(accessToken, project.id);
          } catch {
            /* server may have removed draft already */
          }
          removedAfterAllFailed = true;
          const firstFail = gen.results.find((r) => r.status === 'failed');
          const row = firstFail as { errorMessage?: string; error_message?: string } | undefined;
          const detail =
            row?.errorMessage?.trim() ||
            row?.error_message?.trim() ||
            'All thumbnail generations failed. Credits were refunded.';
          throw new ApiError(detail, 400, INITIAL_GENERATION_ALL_FAILED);
        }
        return { project, gen };
      } catch (err) {
        if (isApiError(err) && err.code === INITIAL_GENERATION_ALL_FAILED) {
          throw err;
        }
        if (!removedAfterAllFailed) {
          try {
            await projectsApi.deleteProject(accessToken, project.id);
          } catch {
            /* ignore */
          }
        }
        throw err;
      }
    },
    onMutate: async (input) => {
      if (!userId) return {};
      const listKey = queryKeys.projects.list(userId);
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() });
      const previous = queryClient.getQueryData<ProjectRow[]>(listKey);
      const optimisticId = `optimistic:${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const optimistic: ProjectRow = {
        id: optimisticId,
        user_id: userId,
        title: input.title?.trim() || 'New project',
        platform: input.platform ?? 'youtube',
        source_type: input.source_type,
        source_data: input.source_data,
        status: 'generating',
        cover_thumbnail_url: null,
        created_at: now,
        updated_at: now,
      };
      const next = previous?.length ? [optimistic, ...previous] : [optimistic];
      queryClient.setQueryData(listKey, next);
      return { previous, listKey, optimisticId };
    },
    onError: (err, _body, context) => {
      if (context?.listKey) {
        if (context.previous === undefined) {
          queryClient.removeQueries({ queryKey: context.listKey });
        } else {
          queryClient.setQueryData(context.listKey, context.previous);
        }
      }
      if (handleBillingMutationError(err)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        return;
      }
      if (isApiError(err) && err.code === INITIAL_GENERATION_ALL_FAILED) {
        toast.error('Generation failed', { description: err.message });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId) });
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
      const listKey = queryKeys.projects.list(userId);
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.lists() });
      const previous = queryClient.getQueryData<ProjectRow[]>(listKey);
      if (previous) {
        queryClient.setQueryData(
          listKey,
          previous.filter((p) => p.id !== projectId),
        );
      }
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(userId, projectId) });
      return { previous, listKey };
    },
    onError: (err, _projectId, context) => {
      if (context?.previous !== undefined && context.listKey) {
        queryClient.setQueryData(context.listKey, context.previous);
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
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.status === 'done').length;
      const total = res.results.length;
      if (ok === 0) {
        toast.error('Generation failed for all variants. Check API keys and model access.');
      } else if (ok < total) {
        toast.warning(`${ok} of ${total} thumbnails ready; some failed.`);
      } else {
        toast.success('Thumbnails generated');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (err) => {
      if (handleBillingMutationError(err)) return;
      if (isApiError(err) && err.code === INITIAL_GENERATION_ALL_FAILED) {
        toast.error('Generation failed', { description: err.message });
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Generation failed');
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
