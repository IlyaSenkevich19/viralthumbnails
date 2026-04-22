import { toast } from 'sonner';
import type { PipelineRunResponse } from '@/lib/api/thumbnails';
import { projectVariantsPath } from '@/config/routes';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import {
  mapResolvedReferences,
  notifyPipelineResultAndNavigate,
  notifyReferenceResolution,
} from './dashboard-create-hub.utils';

type SharedParams = {
  templateId?: string;
  avatarId?: string;
  push: (href: string) => void;
};

export function handlePipelineRunSuccess(params: {
  result: PipelineRunResponse;
  expectedCount: number;
} & SharedParams) {
  const { result, expectedCount, templateId, avatarId, push } = params;
  if (result.warnings?.length) {
    toast.warning(result.warnings.join('\n'));
  }
  notifyReferenceResolution({
    templateId,
    avatarId,
    resolved: mapResolvedReferences(result.resolved_references),
  });
  const persisted = result.persisted_project;
  if (!persisted?.project_id) {
    toast.error('Pipeline run finished but project was not persisted.');
    return;
  }
  notifyPipelineResultAndNavigate({
    push,
    projectId: persisted.project_id,
    templateId,
    avatarId,
    generatedCount: persisted.variants.length,
    expectedCount,
  });
}

export function handleRecoveredPipelineRunSuccess(params: {
  result: PipelineRunResponse;
} & SharedParams) {
  const { result, templateId, avatarId, push } = params;
  const persisted = result.persisted_project;
  if (!persisted?.project_id) {
    toast.error('Recovered run finished but project was not persisted.');
    return;
  }
  if (result.warnings?.length) {
    toast.warning(result.warnings.join('\n'));
  }
  notifyReferenceResolution({
    templateId,
    avatarId,
    resolved: mapResolvedReferences(result.resolved_references),
  });
  toast.success('Recovered your in-progress generation. Opening project…');
  push(projectVariantsPath(persisted.project_id));
}

export function handleRecoveredVideoRunSuccess(params: {
  result: PipelineVideoResponse;
} & SharedParams) {
  const { result, templateId, avatarId, push } = params;
  if (result.warnings?.length) {
    toast.warning(result.warnings.join('\n'));
  }
  notifyReferenceResolution({
    templateId,
    avatarId,
    resolved: result.resolvedReferences,
  });
  toast.success('Recovered your in-progress generation. Opening project…');
  push(projectVariantsPath(result.projectId));
}
