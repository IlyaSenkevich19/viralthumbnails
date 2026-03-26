'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { projectsApi } from '@/lib/api';
import type { ProjectSourceType } from '@/lib/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'youtube' | 'video' | 'script' | 'text';

const tabs: { id: Tab; label: string }[] = [
  { id: 'youtube', label: 'YouTube URL' },
  { id: 'video', label: 'Upload video' },
  { id: 'script', label: 'Script' },
  { id: 'text', label: 'Text' },
];

function tabFromSearchParams(searchParams: URLSearchParams): Tab {
  const t = searchParams.get('tab');
  if (t === 'video' || t === 'script' || t === 'text') return t;
  return 'youtube';
}

export function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  const [tab, setTab] = useState<Tab>(() => tabFromSearchParams(searchParams));
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState(() => searchParams.get('youtube_url') ?? '');
  const [script, setScript] = useState('');
  const [text, setText] = useState('');
  const [videoName, setVideoName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTab(tabFromSearchParams(searchParams));
    const y = searchParams.get('youtube_url');
    if (y) setYoutubeUrl(y);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) {
      toast.error('Not signed in');
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
        source_type = 'youtube_url';
        source_data = { url: youtubeUrl.trim() };
        break;
      case 'video':
        if (!videoName) {
          toast.error('Choose a video file first');
          return;
        }
        source_type = 'video';
        source_data = {
          file_name: videoName,
          note: 'Video binary upload can be wired to storage in a follow-up.',
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

    setSubmitting(true);
    const toastId = toast.loading('Creating project…');
    try {
      const project = await projectsApi.createProject(accessToken, {
        title: title.trim() || undefined,
        platform: 'youtube',
        source_type,
        source_data,
      });
      toast.loading('Generating thumbnails (may take a minute)…', { id: toastId });
      const gen = await projectsApi.generateThumbnails(accessToken, project.id, { count: 3 });
      const ok = gen.results.filter((r) => r.status === 'done').length;
      const total = gen.results.length;
      if (ok === total) {
        toast.success(`${ok} thumbnail${ok === 1 ? '' : 's'} ready`, { id: toastId });
      } else if (ok === 0) {
        toast.error('Generation failed for all variants. Check GEMINI_API_KEY and Imagen access.', {
          id: toastId,
        });
      } else {
        toast.warning(`${ok} of ${total} thumbnails ready; some failed.`, { id: toastId });
      }
      router.push(`/projects/${project.id}/variants`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">New project</h1>
        <p className="text-sm text-muted-foreground">
          Choose a source, then we&apos;ll create variants you can download or refine.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Source</CardTitle>
        </CardHeader>
        <CardContent>
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
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  inputMode="url"
                  autoComplete="url"
                />
              </div>
            )}

            {tab === 'video' && (
              <div className="space-y-2">
                <label htmlFor="video-file" className="text-sm font-medium text-foreground">
                  Video file
                </label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setVideoName(f?.name ?? null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  For now we only store the file name; connect Supabase Storage or S3 to persist video.
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

            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? 'Working…' : 'Create & generate'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
