'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clapperboard, FolderKanban, Link2, Loader2, PenLine, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useNewProject } from '@/contexts/new-project-context';
import { AppRoutes, projectVariantsPath, projectVariantsSearchParams } from '@/config/routes';
import { isLikelyYoutubeUrl } from '@/lib/format';
import { NICHE_ALL, useAvatarsList, useCreateProjectAndGenerateMutation, useTemplatesList } from '@/lib/hooks';
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

type HubMode = 'prompt' | 'youtube';

const modeTabs: { id: HubMode; label: string; icon: typeof PenLine }[] = [
  { id: 'prompt', label: 'Describe', icon: PenLine },
  { id: 'youtube', label: 'YouTube link', icon: Link2 },
];

export function DashboardCreateHub() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const canLoadAssets = !authLoading && Boolean(user?.id && accessToken);
  const { openNewProject } = useNewProject();
  const createAndGenerate = useCreateProjectAndGenerateMutation();

  const [mode, setMode] = useState<HubMode>('prompt');
  const [creative, setCreative] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
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

  function handleGenerate() {
    setUrlError('');
    setDescribeError('');
    if (!accessToken) {
      toast.error('Sign in to generate thumbnails.');
      return;
    }

    if (mode === 'youtube') {
      const trimmed = youtubeUrl.trim();
      if (!trimmed) {
        setUrlError('Paste a YouTube URL to continue.');
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
          generate: { template_id: templateId, count: DEFAULT_VARIANT_COUNT },
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
            } else {
              toast.success('Project ready — opening variants…');
            }
            router.push(
              projectVariantsPath(project.id) +
                projectVariantsSearchParams({ templateId, avatarId }),
            );
          },
        },
      );
      return;
    }

    const hint = creative.trim();
    if (!hint) {
      setDescribeError('Add a short description so we know what to generate.');
      return;
    }

    createAndGenerate.mutate(
      {
        platform: 'youtube',
        source_type: 'text',
        source_data: { text: hint },
        generate: { template_id: templateId, count: DEFAULT_VARIANT_COUNT },
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
          } else {
            toast.success('Project ready — opening variants…');
          }
          router.push(
            projectVariantsPath(project.id) + projectVariantsSearchParams({ templateId, avatarId }),
          );
        },
      },
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-premium"
      aria-labelledby="create-hub-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />

      <div className="relative px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Get started</p>
            <h2 id="create-hub-heading" className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What should your thumbnail look like?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Set optional template and face, describe your idea or paste a YouTube link, then generate — you’ll go
              straight to your new thumbnails. No second form.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2 rounded-xl border border-border bg-background/80 p-1 backdrop-blur-sm"
            role="tablist"
            aria-label="Creation mode"
          >
            {modeTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => {
                  setMode(id);
                  setUrlError('');
                  setDescribeError('');
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium motion-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  mode === id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-sm font-semibold text-foreground">Optional style</h3>
            <p className="text-xs text-muted-foreground">Applied to this generation; you can change again on the project page.</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="create-hub-template" className="text-xs font-medium text-muted-foreground">
                Template
              </label>
              <Select
                value={selectedTemplateId || SELECT_EMPTY_VALUE}
                onValueChange={(v) =>
                  setSelectedTemplateId(v === SELECT_EMPTY_VALUE ? '' : v)
                }
                disabled={assetsBusy}
              >
                <SelectTrigger id="create-hub-template">
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
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="create-hub-face" className="text-xs font-medium text-muted-foreground">
                Face
              </label>
              <Select
                value={selectedAvatarId || SELECT_EMPTY_VALUE}
                onValueChange={(v) =>
                  setSelectedAvatarId(v === SELECT_EMPTY_VALUE ? '' : v)
                }
                disabled={assetsBusy}
              >
                <SelectTrigger id="create-hub-face">
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
        </div>
        {!canLoadAssets ? (
          <p className="mt-2 text-xs text-muted-foreground">Sign in to load templates and saved faces.</p>
        ) : null}

        <div className="relative mt-6 rounded-xl border border-border bg-background/60 p-1 shadow-inner backdrop-blur-sm">
          {mode === 'prompt' ? (
            <div className="relative rounded-lg bg-card/90">
              <label htmlFor="create-hub-creative" className="sr-only">
                Creative direction for your thumbnail
              </label>
              <textarea
                id="create-hub-creative"
                rows={6}
                placeholder="e.g. Bold split layout: tired vs excited energy, big readable title, high contrast reds and dark background, YouTube-style click appeal…"
                value={creative}
                onChange={(e) => {
                  setCreative(e.target.value);
                  if (describeError) setDescribeError('');
                }}
                aria-invalid={Boolean(describeError)}
                aria-describedby={describeError ? 'create-hub-describe-err' : undefined}
                className="min-h-[160px] w-full resize-y rounded-lg border-0 bg-transparent px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {describeError ? (
                <p id="create-hub-describe-err" className="border-t border-border/80 px-3 py-2 text-sm text-destructive" role="alert">
                  {describeError}
                </p>
              ) : (
                <p className="border-t border-border/80 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Manage your library in the sidebar:{' '}
                  <Link
                    href={AppRoutes.templates}
                    className="font-medium text-foreground/85 underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Templates
                  </Link>
                  {' · '}
                  <Link
                    href={AppRoutes.avatars}
                    className="font-medium text-foreground/85 underline-offset-2 hover:text-foreground hover:underline"
                  >
                    My faces
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-card/90 px-4 py-5">
              <label htmlFor="create-hub-youtube" className="text-sm font-medium text-foreground">
                YouTube video URL
              </label>
              <Input
                id="create-hub-youtube"
                placeholder="https://www.youtube.com/watch?v=…"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (urlError) setUrlError('');
                }}
                inputMode="url"
                autoComplete="url"
                aria-invalid={Boolean(urlError)}
                aria-describedby={urlError ? 'create-hub-youtube-err' : undefined}
                className="bg-background/80"
              />
              {urlError ? (
                <p id="create-hub-youtube-err" className="text-sm text-destructive" role="alert">
                  {urlError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll use the link as context for your thumbnail concepts.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 justify-center sm:justify-start"
              onClick={() => openNewProject({})}
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              Other sources…
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => openNewProject({ tab: 'video' })}
            >
              <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
              From video file or URL
            </Button>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!canLoadAssets || createAndGenerate.isPending}
            className="relative gap-2 overflow-hidden shadow-lg shadow-primary/25 sm:min-w-[220px]"
            onClick={handleGenerate}
          >
            <span className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-50" aria-hidden />
            {createAndGenerate.isPending ? (
              <Loader2 className="relative h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="relative h-5 w-5" aria-hidden />
            )}
            <span className="relative font-semibold">
              {createAndGenerate.isPending ? 'Creating…' : 'Generate thumbnails'}
            </span>
          </Button>
        </div>

        <div className="mt-6 border-t border-border/80 pt-5 text-sm">
          <Link
            href={AppRoutes.projects}
            className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
            Open or continue a project
          </Link>
        </div>
      </div>
    </section>
  );
}
