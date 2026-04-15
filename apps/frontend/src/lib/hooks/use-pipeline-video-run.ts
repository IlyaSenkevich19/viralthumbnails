'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';
import { toPipelineVideoResponse } from '@/lib/adapters/pipeline-video-response';
import { queryKeys } from '@/lib/query-keys';
import type { FromVideoRequest } from '@/lib/api/thumbnails';
import { toast } from 'sonner';
import { isApiError } from '@/lib/api/api-error';
import { handleBillingMutationError } from '@/lib/paywall-notify';

export function usePipelineVideoRunMutation() {
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (params: FromVideoRequest) => {
      if (!accessToken) throw new Error('Not signed in');
      const res = await thumbnailsApi.runThumbnailPipelineVideo(accessToken, params);
      return toPipelineVideoResponse(res);
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
