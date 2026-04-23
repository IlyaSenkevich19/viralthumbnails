import {
  Clapperboard,
  Link2,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';
import { projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { creditsForThumbnailPipelineRun } from '@/lib/credit-costs';
import {
  DASHBOARD_PIPELINE_RUN_RECOVERY_KEY,
  DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY,
} from '@/lib/pipeline/pipeline-recovery-storage';

export const DASHBOARD_TEMPLATES_LIMIT = 100;
export const DEFAULT_VIDEO_THUMBNAIL_COUNT = DEFAULT_NEW_PROJECT_VARIANT_COUNT;
export const DASHBOARD_RUN_RECOVERY_KEY = DASHBOARD_PIPELINE_RUN_RECOVERY_KEY;
export const DASHBOARD_VIDEO_RECOVERY_KEY = DASHBOARD_PIPELINE_VIDEO_RECOVERY_KEY;

/** Single source of truth for create-hub source tabs; prefer over string literals. */
export const DASHBOARD_CREATE_HUB_MODE = {
  prompt: 'prompt',
  youtube: 'youtube',
  video: 'video',
} as const;

export type HubMode = (typeof DASHBOARD_CREATE_HUB_MODE)[keyof typeof DASHBOARD_CREATE_HUB_MODE];

export type YoutubeMetaPreview = {
  normalizedUrl: string;
  title?: string | null;
  author?: string | null;
  thumbnail?: string | null;
};

export type ResolvedReferences = {
  templateFromId: boolean;
  faceFromId: boolean;
};

export const dashboardCreateModes: Array<{ id: HubMode; label: string; icon: LucideIcon }> = [
  { id: DASHBOARD_CREATE_HUB_MODE.prompt, label: 'Prompt', icon: PenLine },
  { id: DASHBOARD_CREATE_HUB_MODE.youtube, label: 'YouTube link', icon: Link2 },
  { id: DASHBOARD_CREATE_HUB_MODE.video, label: 'Video', icon: Clapperboard },
];

export function normalizeVideoVariantCount(rawCount: number): number {
  return Math.min(12, Math.max(1, Math.floor(rawCount) || DEFAULT_VIDEO_THUMBNAIL_COUNT));
}

export function creditsRequiredForMode(params: {
  mode: HubMode;
  videoCount: number;
}): number {
  if (params.mode === DASHBOARD_CREATE_HUB_MODE.video) {
    return creditsForThumbnailPipelineRun({
      variantCount: normalizeVideoVariantCount(params.videoCount),
      generateImages: true,
    });
  }
  return creditsForThumbnailPipelineRun({
    variantCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
    generateImages: true,
  });
}

export function notifyPipelineResultAndNavigate(params: {
  projectId: string;
  templateId?: string;
  avatarId?: string;
  generatedCount: number;
  expectedCount: number;
  push: (href: string) => void;
}) {
  const { generatedCount, expectedCount } = params;
  if (generatedCount === 0) {
    toast.error('Generation failed for all variants in pipeline run.');
  } else if (generatedCount < expectedCount) {
    toast.warning(`${generatedCount} of ${expectedCount} thumbnails ready; some failed.`);
  } else {
    toast.success('Opening your variants…');
  }
  params.push(
    projectVariantsPath(params.projectId) +
      projectVariantsSearchParams({
        templateId: params.templateId,
        avatarId: params.avatarId,
      }),
  );
}

export function notifyReferenceResolution(params: {
  templateId?: string;
  avatarId?: string;
  resolved?: Partial<ResolvedReferences>;
}) {
  const { templateId, avatarId, resolved } = params;
  if (!templateId && !avatarId) return;
  const messages: string[] = [];
  if (templateId) {
    messages.push(
      resolved?.templateFromId
        ? 'Template reference applied.'
        : 'Template reference was not resolved from selected template.',
    );
  }
  if (avatarId) {
    messages.push(
      resolved?.faceFromId
        ? 'Face reference applied.'
        : 'Face reference was not resolved from selected avatar.',
    );
  }
  if (messages.length === 0) return;
  const allResolved = messages.every((message) => message.endsWith('applied.'));
  (allResolved ? toast.success : toast.warning)(messages.join(' '));
}

export function mapResolvedReferences(
  resolved:
    | {
        template_from_id?: boolean;
        face_from_id?: boolean;
      }
    | null
    | undefined,
): ResolvedReferences | undefined {
  if (!resolved) return undefined;
  return {
    templateFromId: Boolean(resolved.template_from_id),
    faceFromId: Boolean(resolved.face_from_id),
  };
}

export function buildYoutubeUserPrompt(params: {
  finalUrl: string;
  title?: string;
  author?: string;
}): string {
  return [
    `Create YouTube thumbnail concepts for this video URL: ${params.finalUrl}`,
    params.title ? `Video title: ${params.title}` : '',
    params.author ? `Channel: ${params.author}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
