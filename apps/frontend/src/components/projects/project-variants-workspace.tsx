'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  NICHE_ALL,
  useAvatarsList,
  useDeleteVariantMutation,
  useGenerateThumbnailsMutation,
  useGenerationCredits,
  useRefineThumbnailMutation,
  useTemplateNiches,
  useTemplatesList,
} from '@/lib/hooks';
import { assertSufficientCredits } from '@/lib/paywall-notify';
import { pickThumbnailStyles } from '@/lib/thumbnail-style-matrix';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectVariantsGeneratePanel } from '@/components/projects/project-variants-generate-panel';
import { ProjectVariantsResults } from '@/components/projects/project-variants-results';
import { ProjectVariantsSourceCard } from '@/components/projects/project-variants-source-card';
import { ProjectVariantsTemplatePicker } from '@/components/projects/project-variants-template-picker';
import {
  PROJECT_GENERATE_COUNT_DEFAULT,
  PROJECT_GENERATE_COUNT_MAX,
  PROJECT_GENERATE_COUNT_MIN,
  TEMPLATE_FACE_FILTER,
  isLikelyFacelessTemplate,
  type TemplateFaceFilter,
} from '@/components/projects/project-variants-workspace.constants';
import type { ProjectVariantsWorkspaceProps } from '@/components/projects/project-variants-workspace.types';
import type { ThumbnailTemplateRow } from '@/lib/api/templates';

export type { ProjectVariantsWorkspaceProps } from '@/components/projects/project-variants-workspace.types';

export function ProjectVariantsWorkspace({
  project,
  projectId,
  onRefresh,
  refreshing,
  pipelineJob,
  initialTemplateId = null,
  initialAvatarId = null,
}: ProjectVariantsWorkspaceProps) {
  const { accessToken } = useAuth();
  const { data: credits, isPending: creditsPending } = useGenerationCredits();
  const variants = useMemo(
    () => project.thumbnail_variants ?? [],
    [project.thumbnail_variants],
  );
  const generate = useGenerateThumbnailsMutation(projectId);
  const deleteVariant = useDeleteVariantMutation(projectId);
  const refineThumbnail = useRefineThumbnailMutation(projectId, (next) => setSelectedVariantId(next.id));

  const { data: niches = [] } = useTemplateNiches();

  const [selectedNiche, setSelectedNiche] = useState<string | typeof NICHE_ALL>(NICHE_ALL);
  const [templateFaceFilter, setTemplateFaceFilter] = useState<TemplateFaceFilter>(TEMPLATE_FACE_FILTER.all);
  const [templatePage, setTemplatePage] = useState(1);
  const TEMPLATE_PAGE_SIZE = 24;
  const [loadedTemplates, setLoadedTemplates] = useState<ThumbnailTemplateRow[]>([]);

  useEffect(() => {
    if (templateFaceFilter === TEMPLATE_FACE_FILTER.faceless) {
      setPrioritizeFace(false);
    }
  }, [templateFaceFilter]);

  const {
    data: templatesData,
    isPending: templatesPending,
    isFetching: templatesFetching,
  } = useTemplatesList(selectedNiche, templatePage, TEMPLATE_PAGE_SIZE);
  const templatesLoading = templatesPending && !templatesData;
  const templates = useMemo(() => loadedTemplates, [loadedTemplates]);
  const filteredTemplates = useMemo(() => {
    if (templateFaceFilter === TEMPLATE_FACE_FILTER.all) return templates;
    return templates.filter((template) => {
      const faceless = isLikelyFacelessTemplate(template);
      return templateFaceFilter === TEMPLATE_FACE_FILTER.faceless ? faceless : !faceless;
    });
  }, [templateFaceFilter, templates]);
  const templatesTotal = templatesData?.total ?? 0;
  const canLoadMore = templatePage * TEMPLATE_PAGE_SIZE < templatesTotal;

  useEffect(() => {
    setTemplatePage(1);
    setLoadedTemplates([]);
  }, [selectedNiche]);

  useEffect(() => {
    if (!templatesData?.items) return;
    if (templatePage <= 1) {
      setLoadedTemplates(templatesData.items);
      return;
    }
    setLoadedTemplates((prev) => {
      const seen = new Set(prev.map((t) => t.id));
      const next = [...prev];
      for (const item of templatesData.items) {
        if (!seen.has(item.id)) next.push(item);
      }
      return next;
    });
  }, [templatesData, templatePage]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: avatars = [] } = useAvatarsList();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>('');
  const appliedUrlSelection = useRef(false);
  const [prioritizeFace, setPrioritizeFace] = useState(false);
  const [generateCount, setGenerateCount] = useState(PROJECT_GENERATE_COUNT_DEFAULT);
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
  const selectedStyleLabel: string | null =
    selectedVariant != null ? (styleByVariantId.get(selectedVariant.id) ?? null) : null;

  const clampedGenerateCount = useMemo(
    () =>
      Math.min(
        PROJECT_GENERATE_COUNT_MAX,
        Math.max(PROJECT_GENERATE_COUNT_MIN, Math.floor(generateCount) || PROJECT_GENERATE_COUNT_DEFAULT),
      ),
    [generateCount],
  );
  const generationCreditCost = clampedGenerateCount + 1;

  const handleGenerate = useCallback(() => {
    if (!accessToken) {
      toast.error('Not signed in');
      return;
    }
    if (!assertSufficientCredits({ balance: credits?.balance, cost: generationCreditCost })) return;
    const faceInThumbnail =
      templateFaceFilter === TEMPLATE_FACE_FILTER.withFace
        ? 'with_face'
        : templateFaceFilter === TEMPLATE_FACE_FILTER.faceless
          ? 'faceless'
          : 'default';
    generate.mutate({
      count: clampedGenerateCount,
      template_id: selectedTemplateId ?? undefined,
      avatar_id: selectedAvatarId.trim() || undefined,
      prioritize_face: prioritizeFace,
      face_in_thumbnail: faceInThumbnail,
    });
  }, [
    accessToken,
    credits?.balance,
    generate,
    clampedGenerateCount,
    generationCreditCost,
    prioritizeFace,
    selectedAvatarId,
    selectedTemplateId,
    templateFaceFilter,
  ]);

  const previewUrl: string | null =
    selectedVariant != null ? (selectedVariant.generated_image_url ?? null) : null;
  const sourceData = project.source_data ?? {};
  const sourceVideoUrl =
    typeof sourceData.video_url === 'string' && sourceData.video_url.trim().length > 0
      ? sourceData.video_url
      : null;
  const sourceFileName =
    typeof sourceData.file_name === 'string' && sourceData.file_name.trim().length > 0
      ? sourceData.file_name
      : null;
  const hasSource = Boolean(sourceVideoUrl || sourceFileName);
  const pipelineBusy = pipelineJob?.status === 'queued' || pipelineJob?.status === 'running';
  const pipelineFailed = pipelineJob?.status === 'failed';

  /** Clicks through to paywall when balance is low; do not disable the button for credits only. */
  const canGenerate = Boolean(accessToken && !pipelineBusy);

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

      <div className="flex min-h-0 flex-col gap-8 xl:flex-row xl:items-start xl:gap-8">
        <aside className="w-full shrink-0 space-y-3.5 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-4rem)] xl:w-[min(100%,31rem)] xl:overflow-y-auto xl:pr-2">
          <Card className="overflow-visible border-transparent bg-card/65 shadow-[0_18px_55px_-36px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.025] hover:border-transparent">
            <CardContent className="space-y-5 p-4">
              <p className="max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
                Source summary and template live here; the large preview and version rail stay on the right so you
                judge output first.
              </p>
              {hasSource ? (
                <>
                  <ProjectVariantsSourceCard
                    sourceVideoUrl={sourceVideoUrl}
                    sourceFileName={sourceFileName}
                    pipelineJob={pipelineJob}
                    pipelineBusy={pipelineBusy}
                    pipelineFailed={pipelineFailed}
                  />
                  <div className="h-px bg-white/[0.04]" aria-hidden />
                </>
              ) : null}

              <ProjectVariantsTemplatePicker
                niches={niches}
                selectedNiche={selectedNiche}
                onNicheChange={setSelectedNiche}
                templateFaceFilter={templateFaceFilter}
                onTemplateFaceFilterChange={setTemplateFaceFilter}
                templatesLoading={templatesLoading}
                templatesFetching={templatesFetching}
                filteredTemplates={filteredTemplates}
                templatesTotal={templatesTotal}
                onLoadMore={() => setTemplatePage((p) => p + 1)}
                canLoadMore={canLoadMore}
                selectedTemplateId={selectedTemplateId}
                onToggleTemplate={(id, active) => setSelectedTemplateId(active ? null : id)}
              />

              <div className="h-px bg-white/[0.04]" aria-hidden />

              <ProjectVariantsGeneratePanel
                avatars={avatars}
                selectedAvatarId={selectedAvatarId}
                onAvatarChange={setSelectedAvatarId}
                prioritizeFace={prioritizeFace}
                onPrioritizeFaceChange={setPrioritizeFace}
                templateFaceFilter={templateFaceFilter}
                generateCount={clampedGenerateCount}
                creditCost={generationCreditCost}
                onGenerateCountChange={(n) =>
                  setGenerateCount(
                    Math.min(PROJECT_GENERATE_COUNT_MAX, Math.max(PROJECT_GENERATE_COUNT_MIN, Math.floor(n))),
                  )
                }
                onGenerate={handleGenerate}
                generatePending={generate.isPending}
                pipelineBusy={pipelineBusy}
                canGenerate={canGenerate}
                generateLabel={generate.isPending ? 'Generating…' : 'Generate thumbnails'}
                creditsBalance={typeof credits?.balance === 'number' ? credits.balance : undefined}
                creditsPending={creditsPending && credits == null}
              />
            </CardContent>
          </Card>
        </aside>

        <ProjectVariantsResults
          projectTitle={project.title ?? ''}
          variants={variants}
          styleByVariantId={styleByVariantId}
          selectedVariantId={selectedVariantId}
          onSelectVariant={setSelectedVariantId}
          selectedVariant={selectedVariant}
          selectedStyleLabel={selectedStyleLabel}
          previewUrl={previewUrl}
          onRequestDeleteVariant={(id) => setVariantToDelete(id)}
          onRefresh={() => void onRefresh()}
          refreshing={refreshing}
          pipelineJob={pipelineJob}
          pipelineBusy={pipelineBusy}
          pipelineFailed={pipelineFailed}
          refineControls={{
            applyPending: refineThumbnail.isPending,
            creditsBalance: credits?.balance,
            templateId: selectedTemplateId,
            avatarId: selectedAvatarId.trim() || null,
            onApply: (instruction) => {
              if (!accessToken || !selectedVariantId) return;
              if (selectedVariant?.status !== 'done') return;
              refineThumbnail.mutate({
                variantId: selectedVariantId,
                instruction,
                template_id: selectedTemplateId ?? undefined,
                avatar_id: selectedAvatarId.trim() || undefined,
              });
            },
          }}
        />
      </div>
    </>
  );
}
