'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';
import { NICHE_ALL } from '@/lib/hooks';
import type { TemplateNicheOption, ThumbnailTemplateRow } from '@/lib/api/templates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TEMPLATE_FACE_FILTER,
  type TemplateFaceFilter,
} from '@/components/projects/project-variants-workspace.constants';

type ProjectVariantsTemplatePickerProps = {
  niches: TemplateNicheOption[];
  selectedNiche: string | typeof NICHE_ALL;
  onNicheChange: (niche: string | typeof NICHE_ALL) => void;
  templateFaceFilter: TemplateFaceFilter;
  onTemplateFaceFilterChange: (filter: TemplateFaceFilter) => void;
  templatesLoading: boolean;
  templatesFetching: boolean;
  filteredTemplates: ThumbnailTemplateRow[];
  templatesTotal: number;
  onLoadMore: () => void;
  canLoadMore: boolean;
  selectedTemplateId: string | null;
  onToggleTemplate: (templateId: string, currentlyActive: boolean) => void;
};

export function ProjectVariantsTemplatePicker({
  niches,
  selectedNiche,
  onNicheChange,
  templateFaceFilter,
  onTemplateFaceFilterChange,
  templatesLoading,
  templatesFetching,
  filteredTemplates,
  templatesTotal,
  onLoadMore,
  canLoadMore,
  selectedTemplateId,
  onToggleTemplate,
}: ProjectVariantsTemplatePickerProps) {
  const selectedNicheLabel =
    selectedNiche === NICHE_ALL ? 'Any niche' : niches.find((n) => n.code === selectedNiche)?.label;
  const selectedFaceLabel =
    templateFaceFilter === TEMPLATE_FACE_FILTER.withFace
      ? 'With face'
      : templateFaceFilter === TEMPLATE_FACE_FILTER.faceless
        ? 'Faceless'
        : 'Any face';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Template (optional)</h2>
        <p className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
          {filteredTemplates.length} shown
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Select value={selectedNiche} onValueChange={(value) => onNicheChange(value)}>
            <SelectTrigger className="h-9 bg-card/60">
              <SelectValue placeholder="Niche: any">{`Niche: ${selectedNicheLabel ?? 'Any niche'}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NICHE_ALL}>Any niche</SelectItem>
              {niches.map((n) => (
                <SelectItem key={n.code} value={n.code}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={templateFaceFilter} onValueChange={(value) => onTemplateFaceFilterChange(value as TemplateFaceFilter)}>
            <SelectTrigger className="h-9 bg-card/60">
              <SelectValue>{`People: ${selectedFaceLabel}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TEMPLATE_FACE_FILTER.all}>Any face</SelectItem>
              <SelectItem value={TEMPLATE_FACE_FILTER.withFace}>With face</SelectItem>
              <SelectItem value={TEMPLATE_FACE_FILTER.faceless}>Faceless</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {templatesLoading ? (
        <TemplatesGridSkeleton variant="picker" />
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4',
            templatesFetching && 'opacity-80 transition-opacity',
          )}
        >
          {filteredTemplates.map((t) => {
            const active = selectedTemplateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleTemplate(t.id, active)}
                aria-label={`Template: ${t.name}${active ? ' (selected)' : ''}`}
                className={cn(
                  'overflow-hidden rounded-xl border-2 bg-card text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary shadow-md shadow-primary/15'
                    : 'border-transparent ring-1 ring-border',
                )}
              >
                <div className="relative aspect-video bg-muted">
                  {t.preview_url ? (
                    <Image
                      src={t.preview_url}
                      alt={`Template preview: ${t.name}`}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
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
      {!templatesLoading && filteredTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates match this face filter.</p>
      ) : null}
      {!templatesLoading && templatesTotal > 0 ? (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Showing {filteredTemplates.length} of {templatesTotal}
          </p>
          {canLoadMore ? (
            <Button type="button" variant="outline" size="sm" onClick={onLoadMore} disabled={templatesFetching}>
              {templatesFetching ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
