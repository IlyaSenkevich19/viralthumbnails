'use client';

import Image from 'next/image';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';
import { NICHE_ALL } from '@/lib/hooks';
import type { TemplateNicheOption, ThumbnailTemplateRow } from '@/lib/api/templates';
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
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Choose a template</h2>
      {niches.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedNiche === NICHE_ALL ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => onNicheChange(NICHE_ALL)}
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
              onClick={() => onNicheChange(n.code)}
            >
              {n.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={templateFaceFilter === TEMPLATE_FACE_FILTER.all ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => onTemplateFaceFilterChange(TEMPLATE_FACE_FILTER.all)}
        >
          Any face
        </Button>
        <Button
          type="button"
          size="sm"
          variant={templateFaceFilter === TEMPLATE_FACE_FILTER.withFace ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => onTemplateFaceFilterChange(TEMPLATE_FACE_FILTER.withFace)}
        >
          With face
        </Button>
        <Button
          type="button"
          size="sm"
          variant={templateFaceFilter === TEMPLATE_FACE_FILTER.faceless ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => onTemplateFaceFilterChange(TEMPLATE_FACE_FILTER.faceless)}
        >
          Faceless
        </Button>
      </div>

      {templatesLoading ? (
        <TemplatesGridSkeleton variant="picker" />
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
            templatesFetching && 'opacity-80 transition-opacity',
          )}
        >
          <button
            type="button"
            onClick={() =>
              toast.info('Add a reference template under Templates, then pick it from the grid.')
            }
            aria-label="How to add a style reference template"
            className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="h-6 w-6 opacity-60" aria-hidden />
            <span>Replicate style</span>
          </button>
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
          <p className="text-sm text-muted-foreground">
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
