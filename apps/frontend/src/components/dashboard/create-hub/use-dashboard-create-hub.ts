'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { projectVariantsPath } from '@/config/routes';
import { isLikelyYoutubeUrl } from '@/lib/format';
import { projectsApi, thumbnailsApi } from '@/lib/api';
import {
  useGenerationCredits,
  usePipelineJobSurface,
  usePipelineVideoCreateFlow,
} from '@/lib/hooks';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
import { toast } from 'sonner';
import {
  DASHBOARD_VIDEO_RECOVERY_KEY,
  DEFAULT_VIDEO_THUMBNAIL_COUNT,
  DASHBOARD_CREATE_HUB_MODE,
  type HubMode,
  type YoutubeMetaPreview,
  creditsRequiredForMode,
  buildYoutubeUserPrompt,
  normalizeVideoVariantCount,
} from '../dashboard-create-hub.utils';

export function useDashboardCreateHub() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const canLoadAssets = !authLoading && Boolean(user?.id && accessToken);
  const pipelineSurface = usePipelineJobSurface();
  const pipelineVideoCreate = usePipelineVideoCreateFlow({
    recoveryKey: DASHBOARD_VIDEO_RECOVERY_KEY,
  });

  const [mode, setMode] = useState<HubMode>(DASHBOARD_CREATE_HUB_MODE.prompt);
  const [creative, setCreative] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoRemoteUrl, setVideoRemoteUrl] = useState('');
  const videoCount = DEFAULT_VIDEO_THUMBNAIL_COUNT;
  const [videoResult, setVideoResult] = useState<PipelineVideoResponse | null>(null);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const [urlError, setUrlError] = useState('');
  const [describeError, setDescribeError] = useState('');
  const [youtubeMetaPreview, setYoutubeMetaPreview] = useState<YoutubeMetaPreview | null>(null);
  const { data: credits } = useGenerationCredits();

  const busyProject =
    mode === DASHBOARD_CREATE_HUB_MODE.prompt || mode === DASHBOARD_CREATE_HUB_MODE.youtube
      ? creatingProject
      : false;
  const busyVideo =
    mode === DASHBOARD_CREATE_HUB_MODE.video && (pipelineVideoCreate.isPending || videoPreparing);
  const primaryBusy = busyProject || busyVideo || creatingProject || pipelineSurface.active;
  const requiredCredits = creditsRequiredForMode({ mode, videoCount });
  const cannotAffordGenerate =
    mode === DASHBOARD_CREATE_HUB_MODE.video &&
    credits?.balance != null &&
    credits.balance < requiredCredits;
  const recoveringPreviousGeneration =
    pipelineVideoCreate.jobStatusLabel === 'Resuming';

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
        });
        setVideoResult(data);
        toast.success(`${data.thumbnails.length} thumbnail(s) ready. Opening project…`);
        router.push(projectVariantsPath(data.projectId));
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
        !accessToken
      )
        return;

      setCreatingProject(true);
      try {
        const project = await projectsApi.createProject(accessToken, {
          title: videoMeta?.title ? String(videoMeta.title).slice(0, 200) : undefined,
          source_type: 'youtube_url',
          source_data: {
            url: finalUrl,
            user_prompt: buildYoutubeUserPrompt({
              finalUrl,
              title: videoMeta?.title ? String(videoMeta.title) : undefined,
              author: videoMeta?.author ? String(videoMeta.author) : undefined,
            }),
            video_meta: videoMeta ?? undefined,
          },
        });
        toast.success('Project created. Continue in editor.');
        router.push(projectVariantsPath(project.id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not create project');
      } finally {
        setCreatingProject(false);
      }
      return;
    }

    const hint = creative.trim();
    if (!hint) {
      setDescribeError('Write a short prompt for your thumbnail.');
      return;
    }

    setCreatingProject(true);
    try {
      const project = await projectsApi.createProject(accessToken, {
        source_type: 'text',
        source_data: { text: hint },
      });
      toast.success('Project created. Continue in editor.');
      router.push(projectVariantsPath(project.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setCreatingProject(false);
    }
  }, [
    accessToken,
    mode,
    videoFile,
    videoRemoteUrl,
    videoCount,
    credits?.balance,
    creative,
    youtubeUrl,
    clearModeErrors,
    enrichYoutubeUrl,
    pipelineVideoCreate,
    router,
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
    videoResult,
    videoPreparing,
    urlError,
    setUrlError,
    describeError,
    setDescribeError,
    youtubeMetaPreview,
    accessToken,
    primaryBusy,
    cannotAffordGenerate,
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
