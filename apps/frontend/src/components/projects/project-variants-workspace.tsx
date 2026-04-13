'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Download,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  NICHE_ALL,
  TEMPLATES_DEFAULT_PAGE_SIZE,
  TEMPLATE_PAGE_SIZE_OPTIONS,
  usePrefetchAdjacentTemplates,
  useAvatarsList,
  useDeleteVariantMutation,
  useGenerateThumbnailsMutation,
  useGenerationCredits,
  useTemplateNiches,
  useTemplatesList,
} from '@/lib/hooks';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import { statusToneClass } from '@/lib/status-tone';
import type { ProjectWithVariants, ThumbnailVariantRow } from '@/lib/types/project';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  SELECT_EMPTY_VALUE,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';
import { TemplatesPagination } from '@/components/templates/templates-pagination';
import { pickThumbnailStyles } from '@/lib/thumbnail-style-matrix';

const GENERATE_COUNT = 1;

type ProjectVariantsWorkspaceProps = {
  project: ProjectWithVariants;
  projectId: string;
  onRefresh: () => Promise<unknown>;
  refreshing: boolean;
  /** Applied once on mount when arriving from dashboard / deep link */
  initialTemplateId?: string | null;
  initialAvatarId?: string | null;
};

export function ProjectVariantsWorkspace({
  project,
  projectId,
  onRefresh,
  refreshing,
  initialTemplateId = null,
  initialAvatarId = null,
}: ProjectVariantsWorkspaceProps) {
  const { accessToken } = useAuth();
  const { data: credits } = useGenerationCredits();
  const variants = useMemo(
    () => project.thumbnail_variants ?? [],
    [project.thumbnail_variants],
  );
  const generate = useGenerateThumbnailsMutation(projectId);
  const deleteVariant = useDeleteVariantMutation(projectId);

  const { data: niches = [] } = useTemplateNiches();

  const [selectedNiche, setSelectedNiche] = useState<string | typeof NICHE_ALL>(NICHE_ALL);
  const [templatePage, setTemplatePage] = useState(1);
  const [templateLimit, setTemplateLimit] = useState(TEMPLATES_DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setTemplatePage(1);
  }, [selectedNiche]);

  const handleTemplatePageSize = useCallback((n: number) => {
    setTemplateLimit(n);
    setTemplatePage(1);
  }, []);

  const {
    data: templatesData,
    isPending: templatesPending,
    isFetching: templatesFetching,
    isPlaceholderData: templatesPlaceholder,
  } = useTemplatesList(selectedNiche, templatePage, templateLimit);
  const templatesLoading = templatesPending && !templatesData;
  const templates = templatesData?.items ?? [];
  const templatesTotal = templatesData?.total ?? 0;
  const templatesLimit = templatesData?.limit ?? templateLimit;
  const templatesPaginationBusy = Boolean(templatesFetching && templatesPlaceholder);

  usePrefetchAdjacentTemplates(selectedNiche, templatePage, templateLimit, templatesData?.total);

  useEffect(() => {
    if (!templatesData || templatesPending) return;
    const totalPages = Math.max(1, Math.ceil(templatesData.total / templatesData.limit));
    if (templatePage > totalPages) {
      setTemplatePage(totalPages);
    }
  }, [templatesData, templatesPending, templatePage]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: avatars = [] } = useAvatarsList();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const appliedUrlSelection = useRef(false);
  const [prioritizeFace, setPrioritizeFace] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (appliedUrlSelection.current) return;
    if (!initialTemplateId && !initialAvatarId) return;
    appliedUrlSelection.current = true;
    if (initialTemplateId) setSelectedTemplateId(initialTemplateId);
    if (initialAvatarId) setSelectedAvatarId(initialAvatarId);
  }, [initialTemplateId, initialAvatarId]);

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantId(null);
      return;
    }
    setSelectedVariantId((prev) => {
      if (prev && variants.some((v) => v.id === prev)) return prev;
      const withImg = variants.find((v) => v.generated_image_url && v.status === 'done');
      return (withImg ?? variants[0]).id;
    });
  }, [variants]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );
  const styleByVariantId = useMemo(() => {
    const labels = pickThumbnailStyles(variants.length);
    const map = new Map<string, string>();
    variants.forEach((v, i) => map.set(v.id, labels[i]));
    return map;
  }, [variants]);
  const selectedStyleLabel = selectedVariant ? styleByVariantId.get(selectedVariant.id) : null;

  const handleGenerate = useCallback(() => {
    if (!accessToken) {
      toast.error('Not signed in');
      return;
    }
    if (!assertSufficientCredits({ balance: credits?.balance, cost: GENERATE_COUNT })) return;
    generate.mutate({
      count: GENERATE_COUNT,
      template_id: selectedTemplateId ?? undefined,
      avatar_id: selectedAvatarId.trim() || undefined,
      prioritize_face: prioritizeFace,
    });
  }, [accessToken, credits?.balance, generate, prioritizeFace, selectedAvatarId, selectedTemplateId]);

  const previewUrl = selectedVariant?.generated_image_url ?? null;

  return (
    <>
      <ConfirmationModal
        open={variantToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setVariantToDelete(null);
        }}
        title="Remove this image?"
        description="This generated thumbnail will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (!variantToDelete) return;
          const id = variantToDelete;
          setVariantToDelete(null);
          deleteVariant.mutate(id);
        }}
      />

      <div className="flex min-h-0 flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Left: settings */}
        <aside className="w-full shrink-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] lg:w-[min(100%,44rem)] lg:overflow-y-auto lg:pr-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={AppRoutes.projects}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
            >
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void onRefresh()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Choose a template</h2>
            {niches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedNiche === NICHE_ALL ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => setSelectedNiche(NICHE_ALL)}
                >
                  All
                </Button>
                {niches.map((n) => (
                  <Button
                    key={n.code}
                    type="button"
                    size="sm"
                    variant={selectedNiche === n.code ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setSelectedNiche(n.code)}
                  >
                    {n.label}
                  </Button>
                ))}
              </div>
            ) : null}

            {templatesLoading ? (
              <TemplatesGridSkeleton variant="picker" />
            ) : (
              <div
                className={cn(
                  'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
                  templatesPaginationBusy && 'pointer-events-none opacity-55 transition-opacity',
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Add a reference template under Templates, then pick it from the grid.')
                  }
                  className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Copy className="h-6 w-6 opacity-60" aria-hidden />
                  <span>Replicate style</span>
                </button>
                {templates.map((t) => {
                  const active = selectedTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(active ? null : t.id)}
                      className={cn(
                        'overflow-hidden rounded-xl border-2 bg-card text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary shadow-md shadow-primary/15' : 'border-transparent ring-1 ring-border',
                      )}
                    >
                      <div className="relative aspect-video bg-muted">
                        {t.preview_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.preview_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            No preview
                          </div>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs font-medium text-foreground">{t.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
            {!templatesLoading && templatesTotal > 0 ? (
              <TemplatesPagination
                page={templatePage}
                total={templatesTotal}
                limit={templatesLimit}
                onPageChange={setTemplatePage}
                pageSizeOptions={TEMPLATE_PAGE_SIZE_OPTIONS}
                onPageSizeChange={handleTemplatePageSize}
                isNavBusy={templatesPaginationBusy}
                className="pt-1"
              />
            ) : null}
          </div>

          <div className={cn('surface space-y-4 p-4', 'bg-card/50')}>
            <div className="space-y-1.5">
              <label htmlFor="variant-character" className="text-sm font-medium text-foreground">
                Character (optional)
              </label>
              <Select
                value={selectedAvatarId || SELECT_EMPTY_VALUE}
                onValueChange={(v) =>
                  setSelectedAvatarId(v === SELECT_EMPTY_VALUE ? '' : v)
                }
              >
                <SelectTrigger id="variant-character" className="h-10">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_EMPTY_VALUE}>None</SelectItem>
                  {avatars.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">Prioritize looking like me</span>
              <button
                type="button"
                role="switch"
                aria-checked={prioritizeFace}
                onClick={() => setPrioritizeFace((v) => !v)}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  prioritizeFace ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform',
                    prioritizeFace ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>

            <Button
              type="button"
              className="relative h-12 w-full gap-2 text-base font-semibold"
              onClick={handleGenerate}
              disabled={
                generate.isPending ||
                !accessToken ||
                (credits != null && credits.balance < GENERATE_COUNT)
              }
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {generate.isPending ? 'Generating…' : 'Generate thumbnails'}
              <span className="ml-auto text-xs font-normal opacity-90">
                {GENERATE_COUNT} credit{GENERATE_COUNT === 1 ? '' : 's'}
              </span>
            </Button>
            {selectedAvatarId ? (
              <p className="text-xs text-muted-foreground">
                Your face reference is sent with each generation so the model can match likeness when possible.
              </p>
            ) : null}
          </div>
        </aside>

        {/* Right: results */}
        <section className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Generated thumbnails ({variants.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {variants.length > 0
                ? 'Select a thumbnail below to preview. Open in a new tab or download when ready.'
                : 'Run generation from the left. New variants will show up here.'}
            </p>
          </div>

          {variants.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"
                  aria-hidden
                >
                  <Sparkles className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold tracking-tight text-foreground">No variants yet</p>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Pick a template on the left (optional), set face if you want, then{' '}
                    <strong className="text-foreground/90">Generate thumbnails</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="surface overflow-hidden">
                <div className="relative aspect-video max-h-[min(70vh,520px)] w-full bg-muted">
                  {previewUrl ? (
                    <div
                      key={selectedVariantId}
                      className="vt-preview-reveal flex h-full w-full items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={`Selected thumbnail for ${project.title}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : selectedVariant ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                      {selectedVariant.status === 'failed' ? (
                        <span>{selectedVariant.error_message ?? 'Generation failed'}</span>
                      ) : (
                        <span>No image yet ({selectedVariant.status})</span>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border p-3">
                  {selectedStyleLabel ? (
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground/90">
                      {selectedStyleLabel}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => toast.info('Editing will open in a future update.')}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Modify
                  </Button>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'inline-flex gap-2',
                      )}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Download
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() => toast.info('Watermark removal will be available in a future update.')}
                  >
                    <Wand2 className="h-4 w-4" aria-hidden />
                    Remove watermark
                  </Button>
                  {selectedVariant ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setVariantToDelete(selectedVariant.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">All variants</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {variants.map((v, i) => (
                    <VariantStripThumb
                      key={v.id}
                      enterIndex={i}
                      variant={v}
                      projectTitle={project.title}
                      styleLabel={styleByVariantId.get(v.id)}
                      selected={v.id === selectedVariantId}
                      onSelect={() => setSelectedVariantId(v.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function VariantStripThumb({
  variant,
  projectTitle,
  styleLabel,
  selected,
  onSelect,
  enterIndex,
}: {
  variant: ThumbnailVariantRow;
  projectTitle: string;
  styleLabel?: string;
  selected: boolean;
  onSelect: () => void;
  enterIndex: number;
}) {
  const url = variant.generated_image_url;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${Math.min(enterIndex, 24) * 42}ms` }}
      className={cn(
        'vt-variant-enter relative w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent ring-1 ring-border',
      )}
    >
      <div className="aspect-video w-full">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
            {variant.status}
          </div>
        )}
      </div>
      <Badge
        variant="default"
        className={cn(
          'absolute bottom-1 right-1 px-1.5 py-0 text-[10px] capitalize',
          statusToneClass(variant.status),
        )}
      >
        {variant.status}
      </Badge>
      {styleLabel ? (
        <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/95">
          {styleLabel}
        </span>
      ) : null}
      <span className="sr-only">Select variant for {projectTitle}</span>
    </button>
  );
}
