'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clapperboard, FolderKanban, Link2, Loader2, PenLine, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNewProject } from '@/contexts/new-project-context';
import { AppRoutes, projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { isLikelyYoutubeUrl } from '@/lib/format';
import {
  NICHE_ALL,
  useAvatarsList,
  useCreateProjectAndGenerateMutation,
  useFromVideoThumbnailsMutation,
  useTemplatesList,
} from '@/lib/hooks';
import type { FromVideoResponse } from '@/lib/types/from-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
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
const DEFAULT_VARIANT_COUNT = 3;
const DEFAULT_VIDEO_THUMBNAIL_COUNT = 4;

type HubMode = 'prompt' | 'youtube' | 'video';

const modes: { id: HubMode; label: string; icon: typeof PenLine }[] = [
  { id: 'prompt', label: 'Prompt', icon: PenLine },
  { id: 'youtube', label: 'YouTube link', icon: Link2 },
  { id: 'video', label: 'Video', icon: Clapperboard },
];

function generationToastThenNavigate(
  router: ReturnType<typeof useRouter>,
  projectId: string,
  templateId: string | undefined,
  avatarId: string | undefined,
  gen: { results: { status: string }[] },
) {
  const ok = gen.results.filter((r) => r.status === 'done').length;
  const total = gen.results.length;
  if (ok === 0) {
    toast.error('Generation failed for all variants. Check OPENROUTER_API_KEY and model settings.');
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
  const createAndGenerate = useCreateProjectAndGenerateMutation();
  const fromVideo = useFromVideoThumbnailsMutation();

  const [mode, setMode] = useState<HubMode>('prompt');
  const [creative, setCreative] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoRemoteUrl, setVideoRemoteUrl] = useState('');
  const [videoCount, setVideoCount] = useState(DEFAULT_VIDEO_THUMBNAIL_COUNT);
  const [videoStyle, setVideoStyle] = useState('');
  const [videoResult, setVideoResult] = useState<FromVideoResponse | null>(null);
  const [videoPreparing, setVideoPreparing] = useState(false);

  const [urlError, setUrlError] = useState('');
  const [describeError, setDescribeError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');

  const { data: templatesData, isPending: templatesPending } = useTemplatesList(
    NICHE_ALL,
    1,
    DASHBOARD_TEMPLATES_LIMIT,
  );
  const templates = templatesData?.items ?? [];
  const { data: avatars = [], isPending: avatarsPending } = useAvatarsList();
  const assetsBusy = !canLoadAssets || templatesPending || avatarsPending;

  const templateId = selectedTemplateId || undefined;
  const avatarId = selectedAvatarId || undefined;

  const busyProject =
    mode === 'prompt' || mode === 'youtube' ? createAndGenerate.isPending : false;
  const busyVideo = mode === 'video' && (fromVideo.isPending || videoPreparing);
  const primaryBusy = busyProject || busyVideo;

  function clearModeErrors() {
    setUrlError('');
    setDescribeError('');
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

      const n = Math.min(12, Math.max(1, Math.floor(videoCount) || DEFAULT_VIDEO_THUMBNAIL_COUNT));
      fromVideo.mutate(
        {
          file: fileToSend,
          videoUrl: hasFile ? undefined : url || undefined,
          count: n,
          style: videoStyle.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            setVideoResult(data);
            toast.success(`${data.thumbnails.length} thumbnail(s) ready.`);
          },
        },
      );
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

      createAndGenerate.mutate(
        {
          platform: 'youtube',
          source_type: 'youtube_url',
          source_data: { url: trimmed },
          generate: {
            template_id: templateId,
            count: DEFAULT_VARIANT_COUNT,
            avatar_id: avatarId || undefined,
          },
        },
        {
          onSuccess: ({ project, gen }) =>
            generationToastThenNavigate(router, project.id, templateId, avatarId, gen),
        },
      );
      return;
    }

    const hint = creative.trim();
    if (!hint) {
      setDescribeError('Write a short prompt for your thumbnail.');
      return;
    }

    createAndGenerate.mutate(
      {
        platform: 'youtube',
        source_type: 'text',
        source_data: { text: hint },
        generate: {
          template_id: templateId,
          count: DEFAULT_VARIANT_COUNT,
          avatar_id: avatarId || undefined,
        },
      },
      {
        onSuccess: ({ project, gen }) =>
          generationToastThenNavigate(router, project.id, templateId, avatarId, gen),
      },
    );
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      aria-labelledby="dashboard-create-heading"
    >
      <div className="max-w-3xl">
        <h2
          id="dashboard-create-heading"
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          Create thumbnails
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prompt, YouTube link, or video — then optional template and face. Project flows open variants;
          video analysis shows results here.
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
                if (urlError) setUrlError('');
              }}
              inputMode="url"
              autoComplete="url"
              aria-invalid={Boolean(urlError)}
            />
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
                Long uploads: first {VIDEO_ANALYSIS_MAX_SECONDS / 60} min are kept (trimmed in browser if needed). Very
                large files: use a shorter clip or URL.
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="dash-video-count" className="text-sm font-medium text-foreground">
                  Count (1–12)
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
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Template & face
        </p>
        {mode === 'video' ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Used when you start from <strong className="font-medium text-foreground/90">Prompt</strong> or{' '}
            <strong className="font-medium text-foreground/90">YouTube</strong> (opens a project). Video analysis
            ignores these for now; use style hint above.
          </p>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">Optional. Applied to this generation.</p>
        )}
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
        <p className="mt-2 text-xs text-muted-foreground">
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

      {mode === 'video' && videoResult && videoResult.thumbnails.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground">Results</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Run <span className="font-mono text-[11px]">{videoResult.runId}</span>
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videoResult.thumbnails.map((t) => (
              <li
                key={`${t.storagePath}-${t.rank}`}
                className="overflow-hidden rounded-lg border border-border bg-background"
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
          disabled={!canLoadAssets || primaryBusy}
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
