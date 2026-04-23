import type { ThumbnailTemplateRow } from '@/lib/api/templates';

/** Matches backend `POST …/generate` cap (see `ProjectGenerationService`). */
export const PROJECT_GENERATE_COUNT_MIN = 1;
export const PROJECT_GENERATE_COUNT_MAX = 5;
export const PROJECT_GENERATE_COUNT_DEFAULT = 1;

export const TEMPLATE_FACE_FILTER = {
  all: 'all',
  withFace: 'with-face',
  faceless: 'faceless',
} as const;

export type TemplateFaceFilter = (typeof TEMPLATE_FACE_FILTER)[keyof typeof TEMPLATE_FACE_FILTER];

export function isLikelyFacelessTemplate(template: Pick<ThumbnailTemplateRow, 'name' | 'slug' | 'niche'>): boolean {
  const source = `${template.name} ${template.slug} ${template.niche ?? ''}`.toLowerCase();
  return (
    source.includes('faceless') ||
    source.includes('no face') ||
    source.includes('without face') ||
    source.includes('voiceover')
  );
}
