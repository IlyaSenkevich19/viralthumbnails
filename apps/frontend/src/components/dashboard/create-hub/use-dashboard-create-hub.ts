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
} from '@/lib/hooks';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
import { toast } from 'sonner';
import {
  DEFAULT_VIDEO_THUMBNAIL_COUNT,
  DASHBOARD_CREATE_HUB_MODE,
  type HubMode,
  type YoutubeMetaPreview,
  creditsRequiredForMode,
  buildYoutubeUserPrompt,
  normalizeVideoVariantCount,
  titleFromFirstLine,
  titleFromVideoFileName,
} from '../dashboard-create-hub.utils';

export function useDashboardCreateHub() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const canLoadAssets = !authLoading && Boolean(user?.id && accessToken);
  const pipelineSurface = usePipelineJobSurface();

  const [mode, setMode] = useState<HubMode>(DASHBOARD_CREATE_HUB_MODE.prompt);
  const [creative, setCreative] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
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
  const busyVideo = mode === DASHBOARD_CREATE_HUB_MODE.video && (creatingProject || videoPreparing);
  const primaryBusy = busyProject || busyVideo || creatingProject || pipelineSurface.active;
  const requiredCredits = creditsRequiredForMode({ mode, videoCount });
  const cannotAffordGenerate =
    (mode === DASHBOARD_CREATE_HUB_MODE.video || mode === DASHBOARD_CREATE_HUB_MODE.youtube) &&
    credits?.balance != null &&
    credits.balance < requiredCredits;
  const recoveringPreviousGeneration = pipelineSurface.label === 'Resuming';

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
      if (!videoFile) {
        toast.error('Upload a video file to continue.');
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

      setCreatingProject(true);
      let createdProjectId: string | null = null;
      try {
        const project = await projectsApi.createProject(accessToken, {
          title: titleFromVideoFileName(videoFile.name),
          source_type: 'video',
          source_data: {
            file_name: videoFile?.name,
          },
        });
        createdProjectId = project.id;
        router.push(projectVariantsPath(project.id));
        const created = await thumbnailsApi.runThumbnailPipelineVideo(accessToken, {
          file: fileToSend,
          count: n,
          project_id: project.id,
        });
        await projectsApi.updateProject(accessToken, project.id, {
          source_data: {
            ...(project.source_data ?? {}),
            pipeline_job_id: created.job_id,
          },
        });
        toast.success('Video is being analyzed. Follow progress in the project page.');
      } catch (err) {
        if (createdProjectId) {
          try {
            await projectsApi.updateProject(accessToken, createdProjectId, { status: 'failed' });
          } catch {
            // keep original error surfaced below
          }
        }
        toast.error(err instanceof Error ? err.message : 'Could not start video analysis');
      } finally {
        setCreatingProject(false);
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
          cost: creditsRequiredForMode({ mode: DASHBOARD_CREATE_HUB_MODE.youtube, videoCount }),
        })
      )
        return;

      setCreatingProject(true);
      let createdProjectId: string | null = null;
      try {
        const ytTitle =
          videoMeta?.title != null && String(videoMeta.title).trim()
            ? String(videoMeta.title).trim().slice(0, 200)
            : undefined;
        const project = await projectsApi.createProject(accessToken, {
          ...(ytTitle ? { title: ytTitle } : {}),
          source_type: 'youtube_url',
          source_data: {
            video_url: finalUrl,
            // Keep `url` for backward-compatible consumers while `video_url` stays canonical.
            url: finalUrl,
            title: videoMeta?.title ?? null,
            author: videoMeta?.author ?? null,
            thumbnail: videoMeta?.thumbnail ?? null,
            video_meta: {
              title: videoMeta?.title ?? null,
              author: videoMeta?.author ?? null,
              thumbnail: videoMeta?.thumbnail ?? null,
            },
          },
        });
        createdProjectId = project.id;
        router.push(projectVariantsPath(project.id));
        const created = await thumbnailsApi.createThumbnailPipelineJob(accessToken, {
          user_prompt: buildYoutubeUserPrompt({
            finalUrl,
            title: videoMeta?.title ? String(videoMeta.title) : undefined,
            author: videoMeta?.author ? String(videoMeta.author) : undefined,
          }),
          style: 'YouTube URL context',
          video_url: finalUrl,
          variant_count: DEFAULT_VIDEO_THUMBNAIL_COUNT,
          generate_images: true,
          persist_project: true,
          project_id: project.id,
        });
        await projectsApi.updateProject(accessToken, project.id, {
          source_data: {
            ...(project.source_data ?? {}),
            pipeline_job_id: created.job_id,
          },
        });
        toast.success('YouTube video analysis started. Progress is shown in project page.');
      } catch (err) {
        if (createdProjectId) {
          try {
            await projectsApi.updateProject(accessToken, createdProjectId, { status: 'failed' });
          } catch {
            // keep original error surfaced below
          }
        }
        toast.error(err instanceof Error ? err.message : 'Could not start YouTube analysis');
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
        title: titleFromFirstLine(hint) || undefined,
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
    videoCount,
    credits?.balance,
    creative,
    youtubeUrl,
    clearModeErrors,
    enrichYoutubeUrl,
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
