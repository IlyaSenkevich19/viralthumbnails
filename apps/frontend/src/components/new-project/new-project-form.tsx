'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useCreateProjectAndGenerateMutation } from '@/lib/hooks';
import type { ProjectSourceType } from '@/lib/types/project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { tabs } from './constants';
import type { Tab } from './types';
import { tabFromSearchParams } from './utils';

export type NewProjectFormProps = {
  initialQuery?: Record<string, string>;
  onRequestClose?: () => void;
};

export function NewProjectForm({ initialQuery, onRequestClose }: NewProjectFormProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const createAndGenerate = useCreateProjectAndGenerateMutation();
  const submitLock = useRef(false);

  const sp = useMemo(() => new URLSearchParams(initialQuery ?? {}), [initialQuery]);

  const [tab, setTab] = useState<Tab>(() => tabFromSearchParams(sp));
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState(() => sp.get('youtube_url') ?? '');
  const [script, setScript] = useState('');
  const [text, setText] = useState('');
  const [videoName, setVideoName] = useState<string | null>(null);

  useEffect(() => {
    setTab(tabFromSearchParams(sp));
    setYoutubeUrl(sp.get('youtube_url') ?? '');
  }, [sp]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
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

    submitLock.current = true;
    onRequestClose?.();

    const body = {
      title: title.trim() || undefined,
      platform: 'youtube',
      source_type,
      source_data,
    };

    createAndGenerate.mutate(body, {
      onSuccess: ({ project, gen }) => {
        const ok = gen.results.filter((r) => r.status === 'done').length;
        const total = gen.results.length;
        if (ok === 0) {
          toast.error(
            'Generation failed for all variants. Check GEMINI_API_KEY and Imagen access.',
          );
        } else if (ok < total) {
          toast.warning(`${ok} of ${total} thumbnails ready; some failed.`);
        }
        router.push(`/projects/${project.id}/variants`);
        router.refresh();
      },
      onSettled: () => {
        submitLock.current = false;
      },
    });
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

            <Button type="submit" className="w-full sm:w-auto">
              Create & generate
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
