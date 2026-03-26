'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ProjectSourceType } from '@/lib/types/project';

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
  });
}
