'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNewProject } from '@/contexts/new-project-context';
import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';
import { projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { isLikelyYoutubeUrl } from '@/lib/format';
import { thumbnailsApi } from '@/lib/api';
import {
  NICHE_ALL,
  useAvatarsList,
  useGenerationCredits,
  usePipelineJobSurface,
  usePipelineVideoCreateFlow,
  useThumbnailPipelineMutation,
  useTemplatesList,
} from '@/lib/hooks';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
import { pickThumbnailStyles } from '@/lib/thumbnail-style-matrix';
import { toast } from 'sonner';
import { handlePipelineRunSuccess } from '../dashboard-create-hub.handlers';
import {
  DASHBOARD_RUN_RECOVERY_KEY,
  DASHBOARD_TEMPLATES_LIMIT,
  DASHBOARD_VIDEO_RECOVERY_KEY,
  DEFAULT_VIDEO_THUMBNAIL_COUNT,
  DASHBOARD_CREATE_HUB_MODE,
  type HubMode,
  type YoutubeMetaPreview,
  creditsRequiredForMode,
  buildYoutubeUserPrompt,
  normalizeVideoVariantCount,
  notifyReferenceResolution,
  plannedStyleCountForMode,
} from '../dashboard-create-hub.utils';

export function useDashboardCreateHub() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const canLoadAssets = !authLoading && Boolean(user?.id && accessToken);
  const { openNewProject } = useNewProject();
  const runPipeline = useThumbnailPipelineMutation({
    recoveryKey: DASHBOARD_RUN_RECOVERY_KEY,
  });
  const pipelineSurface = usePipelineJobSurface();
  const pipelineVideoCreate = usePipelineVideoCreateFlow({
    recoveryKey: DASHBOARD_VIDEO_RECOVERY_KEY,
  });

  const [mode, setMode] = useState<HubMode>(DASHBOARD_CREATE_HUB_MODE.prompt);
  const [creative, setCreative] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoRemoteUrl, setVideoRemoteUrl] = useState('');
  const [videoCount, setVideoCount] = useState(DEFAULT_VIDEO_THUMBNAIL_COUNT);
  const [videoStyle, setVideoStyle] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoPrioritizeFace, setVideoPrioritizeFace] = useState(false);
  const [videoResult, setVideoResult] = useState<PipelineVideoResponse | null>(null);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [videoStylingOpen, setVideoStylingOpen] = useState(false);

  const [urlError, setUrlError] = useState('');
  const [describeError, setDescribeError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [youtubeMetaPreview, setYoutubeMetaPreview] = useState<YoutubeMetaPreview | null>(null);

  const { data: templatesData, isPending: templatesPending } = useTemplatesList(
    NICHE_ALL,
    1,
    DASHBOARD_TEMPLATES_LIMIT,
  );
  const templates = templatesData?.items ?? [];
  const { data: avatars = [], isPending: avatarsPending } = useAvatarsList();
  const { data: credits } = useGenerationCredits();
  const assetsBusy = !canLoadAssets || templatesPending || avatarsPending;

  const templateId = selectedTemplateId || undefined;
  const avatarId = selectedAvatarId || undefined;

  useEffect(() => {
    if (selectedTemplateId || selectedAvatarId) {
      setMoreOptionsOpen(true);
    }
  }, [selectedTemplateId, selectedAvatarId]);

  useEffect(() => {
    if (videoStyle.trim() || videoPrompt.trim()) {
      setVideoStylingOpen(true);
    }
  }, [videoStyle, videoPrompt]);

  const busyProject =
    mode === DASHBOARD_CREATE_HUB_MODE.prompt || mode === DASHBOARD_CREATE_HUB_MODE.youtube
      ? runPipeline.isPending
      : false;
  const busyVideo =
    mode === DASHBOARD_CREATE_HUB_MODE.video && (pipelineVideoCreate.isPending || videoPreparing);
  const primaryBusy = busyProject || busyVideo || pipelineSurface.active;
  const requiredCredits = creditsRequiredForMode({ mode, videoCount });
  const cannotAffordGenerate = credits?.balance != null && credits.balance < requiredCredits;
  const plannedStyleCount = plannedStyleCountForMode(mode, videoCount);
  const plannedStyles = useMemo(
    () => pickThumbnailStyles(plannedStyleCount),
    [plannedStyleCount],
  );
  const recoveringPreviousGeneration =
    runPipeline.jobStatusLabel === 'Resuming' || pipelineVideoCreate.jobStatusLabel === 'Resuming';

  const clearModeErrors = useCallback(() => {
    setUrlError('');
    setDescribeError('');
  }, []);

  const enrichYoutubeUrl = useCallback(
    async (raw: string): Promise<{
      finalUrl: string;
      videoMeta?: Record<string, unknown>;
    } | null> => {
      const parsed = await thumbnailsApi.parseVideoUrl(accessToken, raw);
      if (!parsed.ok || !parsed.normalizedUrl) {
        setUrlError(parsed.reason || 'Could not parse YouTube URL.');
        return null;
      }
      const finalUrl = parsed.normalizedUrl;
      const metaRes = await thumbnailsApi.getVideoMeta(accessToken, finalUrl);
      const videoMeta = metaRes.code === '0' && metaRes.data ? metaRes.data : undefined;
      setYoutubeMetaPreview({
        normalizedUrl: finalUrl,
        title: metaRes.data?.title,
        author: metaRes.data?.author,
        thumbnail: metaRes.data?.thumbnail,
      });
      return { finalUrl, videoMeta };
    },
    [accessToken],
  );

  const handleGenerate = useCallback(async () => {
    clearModeErrors();
    if (!accessToken) {
      toast.error('Sign in to continue.');
      return;
    }

    if (mode === DASHBOARD_CREATE_HUB_MODE.video) {
      const hasFile = Boolean(videoFile);
      const url = videoRemoteUrl.trim();
      if (!hasFile && !url) {
        toast.error('Add a video file or a direct HTTPS link to the video.');
        return;
      }

      const n = normalizeVideoVariantCount(videoCount);
      if (
        !assertSufficientCredits({
          balance: credits?.balance,
          cost: creditsRequiredForMode({ mode: DASHBOARD_CREATE_HUB_MODE.video, videoCount }),
        })
      )
        return;

      let fileToSend: File | undefined;
      if (videoFile) {
        setVideoPreparing(true);
        try {
          const trimmed = await maybeTrimVideoForThumbnails(videoFile);
          fileToSend = trimmed;
          if (trimmed !== videoFile) {
            toast.message(
              `Using the first ${VIDEO_ANALYSIS_MAX_SECONDS / 60} minutes for analysis (file was longer).`,
            );
          }
        } catch (err) {
          if (err instanceof TrimVideoError) {
            toast.error(err.message);
            return;
          }
          toast.error(err instanceof Error ? err.message : 'Could not prepare video');
          return;
        } finally {
          setVideoPreparing(false);
        }
      }

      try {
        const data = await pipelineVideoCreate.submit({
          file: fileToSend,
          videoUrl: hasFile ? undefined : url || undefined,
          count: n,
          style: videoStyle.trim() || undefined,
          prompt: videoPrompt.trim() || undefined,
          template_id: templateId,
          avatar_id: avatarId,
          prioritize_face: videoPrioritizeFace && Boolean(avatarId) ? true : undefined,
        });
        notifyReferenceResolution({
          templateId,
          avatarId,
          resolved: data.resolvedReferences,
        });
        setVideoResult(data);
        toast.success(`${data.thumbnails.length} thumbnail(s) ready. Opening project…`);
        router.push(
          projectVariantsPath(data.projectId) + projectVariantsSearchParams({ templateId, avatarId }),
        );
      } catch {
        // handled by mutation onError
      }
      return;
    }

    if (mode === DASHBOARD_CREATE_HUB_MODE.youtube) {
      const trimmed = youtubeUrl.trim();
      if (!trimmed) {
        setUrlError('Paste a YouTube URL.');
        return;
      }
      if (!isLikelyYoutubeUrl(trimmed)) {
        setUrlError('Use a full youtube.com or youtu.be link.');
        return;
      }

      let finalUrl = trimmed;
      let videoMeta: Record<string, unknown> | undefined;
      try {
        const enriched = await enrichYoutubeUrl(trimmed);
        if (!enriched) {
          return;
        }
        finalUrl = enriched.finalUrl;
        videoMeta = enriched.videoMeta;
      } catch {
        // Non-blocking fallback: generation can continue even if metadata enrichment failed.
      }

      if (
        !assertSufficientCredits({
          balance: credits?.balance,
          cost: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
        })
      )
        return;

      runPipeline.mutate(
        {
          user_prompt: buildYoutubeUserPrompt({
            finalUrl,
            title: videoMeta?.title ? String(videoMeta.title) : undefined,
            author: videoMeta?.author ? String(videoMeta.author) : undefined,
          }),
          style: 'YouTube URL context',
          video_url: finalUrl,
          template_id: templateId,
          avatar_id: avatarId || undefined,
          variant_count: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          generate_images: true,
          persist_project: true,
        },
        {
          onSuccess: (result) => {
            handlePipelineRunSuccess({
              result,
              push: router.push,
              templateId,
              avatarId,
              expectedCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
            });
          },
        },
      );
      return;
    }

    const hint = creative.trim();
    if (!hint) {
      setDescribeError('Write a short prompt for your thumbnail.');
      return;
    }

    if (
      !assertSufficientCredits({
        balance: credits?.balance,
        cost: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
      })
    )
      return;

    runPipeline.mutate(
      {
        user_prompt: hint,
        style: 'Prompt-only ideation',
        template_id: templateId,
        avatar_id: avatarId || undefined,
        variant_count: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
        generate_images: true,
        persist_project: true,
      },
      {
        onSuccess: (result) => {
          handlePipelineRunSuccess({
            result,
            push: router.push,
            templateId,
            avatarId,
            expectedCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          });
        },
      },
    );
  }, [
    accessToken,
    mode,
    videoFile,
    videoRemoteUrl,
    videoCount,
    videoStyle,
    videoPrompt,
    templateId,
    avatarId,
    videoPrioritizeFace,
    credits?.balance,
    creative,
    youtubeUrl,
    clearModeErrors,
    enrichYoutubeUrl,
    pipelineVideoCreate,
    router,
    runPipeline,
  ]);

  const onModeChange = useCallback(
    (id: HubMode) => {
      setMode(id);
      clearModeErrors();
      if (id !== DASHBOARD_CREATE_HUB_MODE.video) setVideoResult(null);
    },
    [clearModeErrors],
  );

  const onPromptInput = useCallback((value: string) => {
    setCreative(value);
    setDescribeError((prev) => (prev ? '' : prev));
  }, []);

  const onYoutubeInput = useCallback((value: string) => {
    setYoutubeUrl(value);
    setYoutubeMetaPreview(null);
    setUrlError((prev) => (prev ? '' : prev));
  }, []);

  const onYoutubeBlurEnrich = useCallback(() => {
    const value = youtubeUrl.trim();
    if (!value || !isLikelyYoutubeUrl(value) || !accessToken) return;
    void enrichYoutubeUrl(value).catch(() => {
      /* keep non-blocking */
    });
  }, [accessToken, enrichYoutubeUrl, youtubeUrl]);

  return {
    canLoadAssets,
    openNewProject,
    mode,
    onModeChange,
    creative,
    setCreative,
    youtubeUrl,
    setYoutubeUrl,
    setYoutubeMetaPreview,
    videoFile,
    setVideoFile,
    videoRemoteUrl,
    setVideoRemoteUrl,
    videoCount,
    setVideoCount,
    videoStyle,
    setVideoStyle,
    videoPrompt,
    setVideoPrompt,
    videoPrioritizeFace,
    setVideoPrioritizeFace,
    videoResult,
    videoPreparing,
    moreOptionsOpen,
    setMoreOptionsOpen,
    videoStylingOpen,
    setVideoStylingOpen,
    urlError,
    setUrlError,
    describeError,
    setDescribeError,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedAvatarId,
    setSelectedAvatarId,
    youtubeMetaPreview,
    templates,
    avatars,
    assetsBusy,
    accessToken,
    templateId,
    avatarId,
    primaryBusy,
    cannotAffordGenerate,
    plannedStyleCount,
    plannedStyles,
    recoveringPreviousGeneration,
    clearModeErrors,
    enrichYoutubeUrl,
    handleGenerate,
    onPromptInput,
    onYoutubeInput,
    onYoutubeBlurEnrich,
  } as const;
}

export type DashboardCreateHubViewModel = ReturnType<typeof useDashboardCreateHub>;
