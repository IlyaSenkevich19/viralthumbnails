'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ProjectRow, ProjectSourceType, ProjectWithVariants } from '@/lib/types/project';
import { toast } from 'sonner';

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

export function useCreateProjectAndGenerateMutation() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: async (body: CreateBody) => {
      if (!accessToken) throw new Error('Not signed in');
      const project = await projectsApi.createProject(accessToken, body);
      const gen = await projectsApi.generateThumbnails(accessToken, project.id, { count: 3 });
      return { project, gen };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
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
