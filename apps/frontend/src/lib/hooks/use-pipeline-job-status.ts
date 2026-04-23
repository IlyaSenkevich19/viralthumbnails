'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { thumbnailsApi } from '@/lib/api';

export function usePipelineJobStatus(jobId: string | null | undefined) {
  const { accessToken, user, isLoading: authLoading } = useAuth();
  const enabled = !authLoading && Boolean(accessToken && user?.id && jobId);
  return useQuery({
    queryKey: ['thumbnail-pipeline-job', jobId ?? 'none'],
    queryFn: () => thumbnailsApi.getThumbnailPipelineJob(accessToken!, jobId!),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'queued' || status === 'running') return 2000;
      return false;
    },
  });
}
