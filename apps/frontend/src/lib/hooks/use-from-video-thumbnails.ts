'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { FromVideoRequest } from '@/lib/api/thumbnails';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/api-error';
import { handleBillingMutationError } from '@/lib/paywall-notify';
import type { FromVideoResponse } from '@/lib/types/from-video';

export function useFromVideoThumbnailsMutation() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (params: FromVideoRequest) => {
      if (!accessToken) throw new Error('Not signed in');
      const res = await thumbnailsApi.runThumbnailPipelineVideo(accessToken, params);
      const persisted = res.persisted_project;
      if (!persisted?.project_id) {
        throw new Error('Pipeline run finished but project was not persisted');
      }
      const thumbnails: FromVideoResponse['thumbnails'] = persisted.variants.map((v, index) => ({
        rank: index + 1,
        storagePath: v.storage_path,
        signedUrl: v.signed_url,
        prompt: v.prompt,
        seedIndex: index,
        scores: {},
      }));
      const selectedShots = Array.isArray((res.analysis as Record<string, unknown>)?.bestScenes)
        ? ((res.analysis as Record<string, unknown>).bestScenes as unknown[])
        : [];
      return {
        runId: res.run_id,
        projectId: persisted.project_id,
        analysis: res.analysis,
        selectedShots,
        thumbnails,
      } as FromVideoResponse;
    },
    onError: (err) => {
      if (isApiError(err) && err.statusCode === 429) {
        toast.error('Too many video runs. Try again in a little while.');
        return;
      }
      if (handleBillingMutationError(err)) return;
      toast.error(err instanceof Error ? err.message : 'Video pipeline failed');
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.billing.credits(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(userId) });
      }
    },
  });
}
