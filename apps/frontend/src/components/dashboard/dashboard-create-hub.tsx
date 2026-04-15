'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Clapperboard,
  FolderKanban,
  Link2,
  Loader2,
  PenLine,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNewProject } from '@/contexts/new-project-context';
import { DEFAULT_NEW_PROJECT_VARIANT_COUNT } from '@/config/credits';
import { AppRoutes, projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { isLikelyYoutubeUrl } from '@/lib/format';
import { thumbnailsApi } from '@/lib/api';
import {
  NICHE_ALL,
  useAvatarsList,
  useGenerationCredits,
  usePipelineVideoCreateFlow,
  useThumbnailPipelineMutation,
  useTemplatesList,
} from '@/lib/hooks';
import { creditsForThumbnailPipelineRun } from '@/lib/credit-costs';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
import { pickThumbnailStyles } from '@/lib/thumbnail-style-matrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SELECT_EMPTY_VALUE,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DASHBOARD_TEMPLATES_LIMIT = 100;
const DEFAULT_VIDEO_THUMBNAIL_COUNT = 4;

type HubMode = 'prompt' | 'youtube' | 'video';
type YoutubeMetaPreview = {
  normalizedUrl: string;
  title?: string | null;
  author?: string | null;
  thumbnail?: string | null;
};

const modes: { id: HubMode; label: string; icon: typeof PenLine }[] = [
  { id: 'prompt', label: 'Prompt', icon: PenLine },
  { id: 'youtube', label: 'YouTube link', icon: Link2 },
  { id: 'video', label: 'Video', icon: Clapperboard },
];

function pipelineToastThenNavigate(
  router: ReturnType<typeof useRouter>,
  projectId: string,
  templateId: string | undefined,
  avatarId: string | undefined,
  generatedCount: number,
  expectedCount: number,
) {
  const ok = generatedCount;
  const total = expectedCount;
  if (ok === 0) {
    toast.error('Generation failed for all variants in pipeline run.');
  } else if (ok < total) {
    toast.warning(`${ok} of ${total} thumbnails ready; some failed.`);
  } else {
    toast.success('Opening your variants…');
  }
  router.push(projectVariantsPath(projectId) + projectVariantsSearchParams({ templateId, avatarId }));
}

export function DashboardCreateHub() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const canLoadAssets = !authLoading && Boolean(user?.id && accessToken);
  const { openNewProject } = useNewProject();
  const runPipeline = useThumbnailPipelineMutation();
  const pipelineVideoCreate = usePipelineVideoCreateFlow();

  const [mode, setMode] = useState<HubMode>('prompt');
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
    mode === 'prompt' || mode === 'youtube' ? runPipeline.isPending : false;
  const busyVideo = mode === 'video' && (pipelineVideoCreate.isPending || videoPreparing);
  const primaryBusy = busyProject || busyVideo;
  const cannotAffordGenerate =
    credits?.balance != null &&
    (mode === 'video'
      ? credits.balance <
        creditsForThumbnailPipelineRun({
          variantCount: Math.min(12, Math.max(1, Math.floor(videoCount) || DEFAULT_VIDEO_THUMBNAIL_COUNT)),
          generateImages: true,
        })
      : credits.balance <
        creditsForThumbnailPipelineRun({
          variantCount: DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          generateImages: true,
        }));
  const plannedStyleCount = mode === 'video'
    ? Math.min(12, Math.max(1, Math.floor(videoCount) || DEFAULT_VIDEO_THUMBNAIL_COUNT))
    : DEFAULT_NEW_PROJECT_VARIANT_COUNT;
  const plannedStyles = pickThumbnailStyles(plannedStyleCount);

  function clearModeErrors() {
    setUrlError('');
    setDescribeError('');
  }

  async function enrichYoutubeUrl(raw: string): Promise<{
    finalUrl: string;
    videoMeta?: Record<string, unknown>;
  } | null> {
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
  }

  async function handleGenerate() {
    clearModeErrors();
    if (!accessToken) {
      toast.error('Sign in to continue.');
      return;
    }

    if (mode === 'video') {
      const hasFile = Boolean(videoFile);
      const url = videoRemoteUrl.trim();
      if (!hasFile && !url) {
        toast.error('Add a video file or a direct HTTPS link to the video.');
        return;
      }

      const n = Math.min(12, Math.max(1, Math.floor(videoCount) || DEFAULT_VIDEO_THUMBNAIL_COUNT));
      if (
        !assertSufficientCredits({
          balance: credits?.balance,
          cost: creditsForThumbnailPipelineRun({
            variantCount: n,
            generateImages: true,
          }),
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
        setVideoResult(data);
        toast.success(`${data.thumbnails.length} thumbnail(s) ready. Opening project…`);
        router.push(
          projectVariantsPath(data.projectId) +
            projectVariantsSearchParams({ templateId, avatarId }),
        );
      } catch {
        // handled by mutation onError
      }
      return;
    }

    if (mode === 'youtube') {
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
          user_prompt: [
            `Create YouTube thumbnail concepts for this video URL: ${finalUrl}`,
            videoMeta?.title ? `Video title: ${String(videoMeta.title)}` : '',
            videoMeta?.author ? `Channel: ${String(videoMeta.author)}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
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
            if (result.warnings?.length) {
              toast.warning(result.warnings.join('\n'));
            }
            const persisted = result.persisted_project;
            if (!persisted?.project_id) {
              toast.error('Pipeline run finished but project was not persisted.');
              return;
            }
            pipelineToastThenNavigate(
              router,
              persisted.project_id,
              templateId,
              avatarId,
              persisted.variants.length,
              DEFAULT_NEW_PROJECT_VARIANT_COUNT,
            );
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
          if (result.warnings?.length) {
            toast.warning(result.warnings.join('\n'));
          }
          const persisted = result.persisted_project;
          if (!persisted?.project_id) {
            toast.error('Pipeline run finished but project was not persisted.');
            return;
          }
          pipelineToastThenNavigate(
            router,
            persisted.project_id,
            templateId,
            avatarId,
            persisted.variants.length,
            DEFAULT_NEW_PROJECT_VARIANT_COUNT,
          );
        },
      },
    );
  }

  return (
    <section className="surface-dashboard p-6 sm:p-8" aria-labelledby="dashboard-create-heading">
      <div className="max-w-3xl">
        <h2
          id="dashboard-create-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Create <span className="text-primary">thumbnails</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a starting point below. Template, face, and extra video styling stay under{' '}
          <span className="font-medium text-foreground/90">More options</span> until you need them.
        </p>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="How you provide context"
      >
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              clearModeErrors();
              if (id !== 'video') setVideoResult(null);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              mode === id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Tip:</span> Prompt is the fastest first try. YouTube and Video
        add more context when you need it.
      </p>

      <div className="mt-4">
        {mode === 'prompt' && (
          <div className="space-y-1.5">
            <label htmlFor="dash-prompt" className="text-sm font-medium text-foreground">
              Prompt
            </label>
            <textarea
              id="dash-prompt"
              rows={5}
              placeholder="Describe layout, colors, mood, text on thumbnail…"
              value={creative}
              onChange={(e) => {
                setCreative(e.target.value);
                if (describeError) setDescribeError('');
              }}
              aria-invalid={Boolean(describeError)}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {describeError ? (
              <p className="text-sm text-destructive" role="alert">
                {describeError}
              </p>
            ) : null}
          </div>
        )}

        {mode === 'youtube' && (
          <div className="space-y-1.5">
            <label htmlFor="dash-youtube" className="text-sm font-medium text-foreground">
              YouTube URL
            </label>
            <Input
              id="dash-youtube"
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setYoutubeMetaPreview(null);
                if (urlError) setUrlError('');
              }}
              onBlur={() => {
                const value = youtubeUrl.trim();
                if (!value || !isLikelyYoutubeUrl(value) || !accessToken) return;
                void enrichYoutubeUrl(value).catch(() => {
                  /* keep non-blocking */
                });
              }}
              inputMode="url"
              autoComplete="url"
              aria-invalid={Boolean(urlError)}
            />
            {youtubeMetaPreview ? (
              <div className="surface mt-2 flex items-center gap-3 p-2.5">
                {youtubeMetaPreview.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={youtubeMetaPreview.thumbnail}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded-md object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {youtubeMetaPreview.title || 'YouTube video'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {youtubeMetaPreview.author || 'Unknown channel'}
                  </p>
                </div>
              </div>
            ) : null}
            {urlError ? (
              <p className="text-sm text-destructive" role="alert">
                {urlError}
              </p>
            ) : null}
          </div>
        )}

        {mode === 'video' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="dash-video-file" className="text-sm font-medium text-foreground">
                Video file
              </label>
              <Input
                id="dash-video-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                First {VIDEO_ANALYSIS_MAX_SECONDS / 60} min analyzed (trimmed in browser). Huge files: shorter clip or
                URL.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dash-video-url" className="text-sm font-medium text-foreground">
                Or video URL
              </label>
              <Input
                id="dash-video-url"
                placeholder="https://… (direct file link)"
                value={videoRemoteUrl}
                onChange={(e) => setVideoRemoteUrl(e.target.value)}
                inputMode="url"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dash-video-count" className="text-sm font-medium text-foreground">
                Thumbnail count (1–12)
              </label>
              <Input
                id="dash-video-count"
                type="number"
                min={1}
                max={12}
                value={videoCount}
                onChange={(e) => setVideoCount(Number(e.target.value))}
              />
            </div>

            <details
              className="group rounded-xl border border-border/80 bg-muted/15 [&_summary::-webkit-details-marker]:hidden"
              open={videoStylingOpen}
              onToggle={(e) => setVideoStylingOpen(e.currentTarget.open)}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left motion-base hover:bg-muted/25">
                <span>
                  <span className="text-sm font-medium text-foreground">Video styling</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Optional style hint and creative direction for analysis
                  </span>
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-4">
                <div className="space-y-1.5">
                  <label htmlFor="dash-video-style" className="text-sm font-medium text-foreground">
                    Style hint (optional)
                  </label>
                  <Input
                    id="dash-video-style"
                    placeholder="e.g. bold title, neon"
                    value={videoStyle}
                    onChange={(e) => setVideoStyle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="dash-video-prompt" className="text-sm font-medium text-foreground">
                    Creative direction (optional)
                  </label>
                  <textarea
                    id="dash-video-prompt"
                    rows={4}
                    placeholder="What should thumbnails emphasize? e.g. product close-up, shocked reaction…"
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in analysis and each thumbnail (separate from the short style hint).
                  </p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      <details
        className="group mt-8 border-t border-border pt-2 [&_summary::-webkit-details-marker]:hidden"
        open={moreOptionsOpen}
        onToggle={(e) => setMoreOptionsOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-3 text-left motion-base hover:bg-secondary/30">
          <span>
            <span className="text-sm font-medium text-foreground">More options</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Template & face — optional for every mode; face checkbox applies to Video
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="space-y-4 border-t border-border/70 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="dash-template" className="text-sm font-medium text-foreground">
                Template
              </label>
              <Select
                value={selectedTemplateId || SELECT_EMPTY_VALUE}
                onValueChange={(v) => setSelectedTemplateId(v === SELECT_EMPTY_VALUE ? '' : v)}
                disabled={assetsBusy}
              >
                <SelectTrigger id="dash-template">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dash-face" className="text-sm font-medium text-foreground">
                Face
              </label>
              <Select
                value={selectedAvatarId || SELECT_EMPTY_VALUE}
                onValueChange={(v) => setSelectedAvatarId(v === SELECT_EMPTY_VALUE ? '' : v)}
                disabled={assetsBusy}
              >
                <SelectTrigger id="dash-face">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                  {avatars.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name?.trim() ? a.name : a.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {mode === 'video' && selectedAvatarId ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input"
                checked={videoPrioritizeFace}
                onChange={(e) => setVideoPrioritizeFace(e.target.checked)}
              />
              <span>
                <span className="font-medium">Prioritize face likeness</span>
                <span className="block text-xs text-muted-foreground">
                  Stronger match to your face reference in thumbnails.
                </span>
              </span>
            </label>
          ) : null}
          <p className="text-xs text-muted-foreground">
            <Link href={AppRoutes.templates} className="underline-offset-2 hover:underline">
              All templates
            </Link>
            {' · '}
            <Link href={AppRoutes.avatars} className="underline-offset-2 hover:underline">
              My faces
            </Link>
            {!canLoadAssets ? ' · Sign in to load lists.' : null}
          </p>
        </div>
      </details>

      {mode === 'video' && videoResult && videoResult.thumbnails.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">Results</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Run <span className="font-mono text-[11px]">{videoResult.runId}</span>
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videoResult.thumbnails.map((t, i) => (
              <li
                key={`${t.storagePath}-${t.rank}`}
                style={{ animationDelay: `${Math.min(i, 24) * 42}ms` }}
                className="vt-variant-enter overflow-hidden rounded-lg border border-border bg-background"
              >
                <a href={t.signedUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.signedUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                </a>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground">#{t.rank}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{t.prompt}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Planned styles ({plannedStyleCount})
        </p>
        <div className="flex flex-wrap gap-2">
          {plannedStyles.map((style, i) => (
            <span
              key={`${style}-${i}`}
              className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-foreground/90"
            >
              {style}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link
            href={AppRoutes.projects}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <FolderKanban className="h-4 w-4" aria-hidden />
            Projects
          </Link>
          <button
            type="button"
            onClick={() => openNewProject({})}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            Script &amp; more
          </button>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={!canLoadAssets || primaryBusy || cannotAffordGenerate}
          className="w-full sm:w-auto sm:min-w-[200px]"
          onClick={() => void handleGenerate()}
        >
          {primaryBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-5 w-5" aria-hidden />
          )}
          <span className="font-semibold">
            {videoPreparing
              ? 'Preparing video…'
              : primaryBusy
                ? mode === 'video'
                  ? 'Working…'
                  : 'Creating…'
                : mode === 'video'
                  ? 'Analyze video'
                  : 'Generate'}
          </span>
        </Button>
      </div>
    </section>
  );
}
