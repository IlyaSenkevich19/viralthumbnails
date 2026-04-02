'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ProjectRow, ProjectSourceType, ProjectWithVariants } from '@/lib/types/project';
import { toast } from 'sonner';

export const createProjectAndGenerateMutationKey = ['projects', 'create-and-generate'] as const;

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
  generate?: { template_id?: string; count?: number };
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
      const gen = await projectsApi.generateThumbnails(accessToken, project.id, {
        count: generate?.count ?? 3,
        template_id: generate?.template_id,
      });
      return { project, gen };
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
    mutationFn: async (opts: { template_id?: string; count?: number }) => {
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
