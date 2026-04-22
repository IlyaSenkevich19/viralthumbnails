'use client';

import { toast } from 'sonner';
import type { PipelineVideoRunRequest } from '@/lib/api/thumbnails';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import { usePipelineVideoRunMutation } from './use-pipeline-video-run';

/**
 * Shared video-create flow over `pipeline/run-video`:
 * - executes the mutation
 * - surfaces backend warnings (e.g. unresolved template/avatar refs)
 */
type PipelineVideoCreateFlowOptions = {
  /** Passed through to the underlying mutation (localStorage for reload recovery). */
  recoveryKey?: string;
};

export function usePipelineVideoCreateFlow(options?: PipelineVideoCreateFlowOptions) {
  const mutation = usePipelineVideoRunMutation(options);

  const submit = async (params: PipelineVideoRunRequest): Promise<PipelineVideoResponse> => {
    const result = await mutation.mutateAsync(params);
    if (result.warnings?.length) {
      toast.warning(result.warnings.join('\n'));
    }
    return result;
  };

  return {
    submit,
    isPending: mutation.isPending,
    jobStatusLabel: mutation.jobStatusLabel,
  };
}
