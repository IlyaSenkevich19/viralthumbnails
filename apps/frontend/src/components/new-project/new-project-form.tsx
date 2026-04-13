'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useCreateProjectAndGenerateMutation, useFromVideoThumbnailsMutation } from '@/lib/hooks';
import { thumbnailsApi } from '@/lib/api';
import { isLikelyYoutubeUrl } from '@/lib/format';
import type { ProjectSourceType } from '@/lib/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { toast } from 'sonner';
import { tabs } from './constants';
import type { Tab } from './types';
import { tabFromSearchParams } from './utils';
import type { FromVideoResponse } from '@/lib/types/from-video';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { maybeTrimVideoForThumbnails, TrimVideoError } from '@/lib/video/trim-video-for-thumbnails';
import { pickThumbnailStyles } from '@/lib/thumbnail-style-matrix';

export type NewProjectFormProps = {
  initialQuery?: Record<string, string>;
  onRequestClose?: () => void;
};

type YoutubeMetaPreview = {
  normalizedUrl: string;
  title?: string | null;
  author?: string | null;
  thumbnail?: string | null;
};

export function NewProjectForm({ initialQuery, onRequestClose }: NewProjectFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const createAndGenerate = useCreateProjectAndGenerateMutation();
  const fromVideoThumbnails = useFromVideoThumbnailsMutation();
  const submitLock = useRef(false);

  const sp = useMemo(() => new URLSearchParams(initialQuery ?? {}), [initialQuery]);

  const [tab, setTab] = useState<Tab>(() => tabFromSearchParams(sp));
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState(() => sp.get('youtube_url') ?? '');
  const [script, setScript] = useState('');
  const [text, setText] = useState(() => sp.get('prefill_text') ?? '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoRemoteUrl, setVideoRemoteUrl] = useState('');
  const [videoCount, setVideoCount] = useState(4);
  const [videoStyle, setVideoStyle] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoResult, setVideoResult] = useState<FromVideoResponse | null>(null);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [youtubeMetaPreview, setYoutubeMetaPreview] = useState<YoutubeMetaPreview | null>(null);
  const plannedStyleCount = tab === 'video' ? Math.min(12, Math.max(1, Math.floor(videoCount) || 4)) : 3;
  const plannedStyles = pickThumbnailStyles(plannedStyleCount);

  useEffect(() => {
    setTab(tabFromSearchParams(sp));
    setYoutubeUrl(sp.get('youtube_url') ?? '');
    setText(sp.get('prefill_text') ?? '');
  }, [sp]);

  useEffect(() => {
    if (tab !== 'video') setVideoResult(null);
  }, [tab]);

  async function enrichYoutubeUrl(raw: string): Promise<{
    finalUrl: string;
    videoMeta?: Record<string, unknown>;
  } | null> {
    const parsed = await thumbnailsApi.parseVideoUrl(accessToken, raw);
    if (!parsed.ok || !parsed.normalizedUrl) {
      toast.error(parsed.reason || 'Could not parse YouTube URL');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    if (!accessToken) {
      toast.error('Not signed in');
      return;
    }

    if (tab === 'video') {
      const hasFile = Boolean(videoFile);
      const url = videoRemoteUrl.trim();
      if (!hasFile && !url) {
        toast.error('Upload a video file or paste a direct HTTPS URL to the video.');
        return;
      }
      const n = Math.min(12, Math.max(1, Math.floor(videoCount) || 4));

      let fileToSend: File | undefined;
      if (videoFile) {
        setVideoPreparing(true);
        try {
          const trimmed = await maybeTrimVideoForThumbnails(videoFile);
          fileToSend = trimmed;
          if (trimmed !== videoFile) {
            toast.message(
              `Using the first ${VIDEO_ANALYSIS_MAX_SECONDS / 60} minutes for analysis (full video was longer).`,
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

      const templateIdFromQuery = sp.get('template_id') || undefined;
      const avatarIdFromQuery = sp.get('avatar_id') || undefined;

      submitLock.current = true;
      fromVideoThumbnails.mutate(
        {
          file: fileToSend,
          videoUrl: hasFile ? undefined : url || undefined,
          count: n,
          style: videoStyle.trim() || undefined,
          prompt: videoPrompt.trim() || undefined,
          template_id: templateIdFromQuery,
          avatar_id: avatarIdFromQuery,
        },
        {
          onSuccess: (data) => {
            setVideoResult(data);
            toast.success(`${data.thumbnails.length} thumbnail(s) ready — opening project…`);
            onRequestClose?.();
            router.push(
              projectVariantsPath(data.projectId) +
                projectVariantsSearchParams({
                  templateId: templateIdFromQuery,
                  avatarId: avatarIdFromQuery,
                }),
            );
          },
          onSettled: () => {
            submitLock.current = false;
          },
        },
      );
      return;
    }

    let source_type: ProjectSourceType;
    let source_data: Record<string, unknown>;

    switch (tab) {
      case 'youtube':
        if (!youtubeUrl.trim()) {
          toast.error('Paste a YouTube URL');
          return;
        }
        if (!isLikelyYoutubeUrl(youtubeUrl.trim())) {
          toast.error('Use a full youtube.com or youtu.be link.');
          return;
        }
        let finalUrl = youtubeUrl.trim();
        let videoMeta: Record<string, unknown> | undefined;
        try {
          const enriched = await enrichYoutubeUrl(finalUrl);
          if (!enriched) {
            return;
          }
          finalUrl = enriched.finalUrl;
          videoMeta = enriched.videoMeta;
        } catch {
          // non-blocking; continue with URL-only context
        }
        source_type = 'youtube_url';
        source_data = {
          url: finalUrl,
          ...(videoMeta ? { video_meta: videoMeta } : {}),
        };
        break;
      case 'script':
        if (!script.trim()) {
          toast.error('Paste or write your script');
          return;
        }
        source_type = 'script';
        source_data = { script: script.trim() };
        break;
      case 'text':
        if (!text.trim()) {
          toast.error('Describe the thumbnail you want');
          return;
        }
        source_type = 'text';
        source_data = { text: text.trim() };
        break;
    }

    submitLock.current = true;
    onRequestClose?.();

    const templateId = sp.get('template_id') || undefined;
    const avatarId = sp.get('avatar_id') || undefined;

    createAndGenerate.mutate(
      {
        title: title.trim() || undefined,
        platform: 'youtube',
        source_type,
        source_data,
        generate: { template_id: templateId, count: 3, avatar_id: avatarId },
      },
      {
        onSuccess: ({ project, gen }) => {
          const ok = gen.results.filter((r) => r.status === 'done').length;
          const total = gen.results.length;
          if (ok === 0) {
            toast.error(
              'Generation failed for all variants. Check OPENROUTER_API_KEY and image model settings.',
            );
          } else if (ok < total) {
            toast.warning(`${ok} of ${total} thumbnails ready; some failed.`);
          }
          router.push(
            projectVariantsPath(project.id) +
              projectVariantsSearchParams({ templateId, avatarId }),
          );
        },
        onSettled: () => {
          submitLock.current = false;
        },
      },
    );
  }

  return (
    <div className="space-y-0">
      <Card className="border-0 bg-transparent shadow-none ring-0 hover:border-transparent hover:shadow-none">
        <CardHeader className="px-0 pb-2 pt-0">
          <CardTitle className="text-base">Source</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Source type"
            >
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium motion-base focus-ring',
                    tab === id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-border-hover hover:text-foreground',
                    tab !== id && 'bg-background/60',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label htmlFor="project-title" className="text-sm font-medium text-foreground">
                Project title (optional)
              </label>
              <Input
                id="project-title"
                placeholder="e.g. Summer travel vlog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
              />
            </div>

            {tab === 'youtube' && (
              <div className="space-y-1">
                <label htmlFor="youtube-url" className="text-sm font-medium text-foreground">
                  YouTube URL
                </label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setYoutubeMetaPreview(null);
                  }}
                  onBlur={() => {
                    const value = youtubeUrl.trim();
                    if (!value || !isLikelyYoutubeUrl(value) || !accessToken) return;
                    void enrichYoutubeUrl(value).catch(() => {
                      /* non-blocking preview */
                    });
                  }}
                  inputMode="url"
                  autoComplete="url"
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
              </div>
            )}

            {tab === 'video' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="video-file" className="text-sm font-medium text-foreground">
                    Video file
                  </label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setVideoFile(f ?? null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Long files: only the <strong className="text-foreground/90">first {VIDEO_ANALYSIS_MAX_SECONDS / 60} minutes</strong>{' '}
                    are sent for analysis (trimmed in your browser before upload). Very large files may need a shorter clip or a
                    direct HTTPS link instead.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Or paste a direct HTTPS link to the file (no YouTube watch pages) — the server fetches the full file; trim
                    applies to uploads only.
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="video-url" className="text-sm font-medium text-foreground">
                    Video URL (optional if uploading)
                  </label>
                  <Input
                    id="video-url"
                    placeholder="https://…"
                    value={videoRemoteUrl}
                    onChange={(e) => setVideoRemoteUrl(e.target.value)}
                    inputMode="url"
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="video-count" className="text-sm font-medium text-foreground">
                      Thumbnail count (1–12)
                    </label>
                    <Input
                      id="video-count"
                      type="number"
                      min={1}
                      max={12}
                      value={videoCount}
                      onChange={(e) => setVideoCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="video-style" className="text-sm font-medium text-foreground">
                      Style hint (optional)
                    </label>
                    <Input
                      id="video-style"
                      placeholder="e.g. bold text, neon accents"
                      value={videoStyle}
                      onChange={(e) => setVideoStyle(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="video-creative" className="text-sm font-medium text-foreground">
                    Creative direction (optional)
                  </label>
                  <textarea
                    id="video-creative"
                    className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground motion-base focus-ring focus-visible:border-primary"
                    placeholder="What to emphasize in analysis and thumbnails…"
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Template and face from the page URL (if opened with template_id / avatar_id) are passed to generation.
                  Saves a project and opens variants when done. Credits: 1 analysis + 2×count generations; rate-limited.
                </p>
              </div>
            )}

            {tab === 'script' && (
              <div className="space-y-1">
                <label htmlFor="project-script" className="text-sm font-medium text-foreground">
                  Script
                </label>
                <textarea
                  id="project-script"
                  className="flex min-h-[140px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground motion-base focus-ring focus-visible:border-primary"
                  placeholder="Paste your video script…"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                />
              </div>
            )}

            {tab === 'text' && (
              <div className="space-y-1">
                <label htmlFor="project-text" className="text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="project-text"
                  className="flex min-h-[140px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground motion-base focus-ring focus-visible:border-primary"
                  placeholder="Describe the vibe, colors, text on thumbnail…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
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

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                tab === 'video'
                  ? fromVideoThumbnails.isPending || videoPreparing
                  : createAndGenerate.isPending
              }
            >
              {tab === 'video'
                ? videoPreparing
                  ? 'Preparing video…'
                  : fromVideoThumbnails.isPending
                    ? 'Working…'
                    : 'Generate from video'
                : createAndGenerate.isPending
                  ? 'Working…'
                  : 'Create & generate'}
            </Button>
          </form>

          {tab === 'video' && videoResult && videoResult.thumbnails.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground">Results</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Run <span className="font-mono text-[11px]">{videoResult.runId}</span> — open or save each image.
              </p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {videoResult.thumbnails.map((t) => (
                  <li
                    key={`${t.storagePath}-${t.rank}`}
                    className="surface overflow-hidden"
                  >
                    <a
                      href={t.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* Signed Supabase URLs are per-project; skip next/image remote config. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.signedUrl}
                        alt={t.prompt.slice(0, 120)}
                        className="aspect-video w-full object-cover"
                        loading="lazy"
                      />
                    </a>
                    <div className="space-y-1 p-3">
                      <p className="text-xs font-medium text-foreground">Rank #{t.rank}</p>
                      <p className="line-clamp-3 text-xs text-muted-foreground">{t.prompt}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
