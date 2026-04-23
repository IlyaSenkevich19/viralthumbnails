import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';
import type { ProjectWithVariants } from '@/lib/types/project';

export type ProjectVariantsWorkspaceProps = {
  project: ProjectWithVariants;
  projectId: string;
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
  pipelineJob?: PipelineJobStatusResponse;
  /** Applied once on mount when arriving from dashboard / deep link */
  initialTemplateId?: string | null;
  initialAvatarId?: string | null;
};
