import { fetchJson } from './fetch-json';

export const TEMPLATES_DEFAULT_PAGE_SIZE = 24;

/** Allowed page sizes (must stay within backend max 100). */
export const TEMPLATE_PAGE_SIZE_OPTIONS = [12, 24, 48, 100] as const;
export type TemplatePageSizeOption = (typeof TEMPLATE_PAGE_SIZE_OPTIONS)[number];

export function parseTemplatePageSizeParam(raw: string | null): number {
  if (raw == null || raw === '') return TEMPLATES_DEFAULT_PAGE_SIZE;
  const n = parseInt(raw, 10);
  return (TEMPLATE_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : TEMPLATES_DEFAULT_PAGE_SIZE;
}

export interface TemplateNicheOption {
  code: string;
  label: string;
}

export interface ThumbnailTemplateRow {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  storage_path: string;
  mime_type: string;
  niche?: string | null;
  created_at: string;
  updated_at: string;
  preview_url?: string | null;
}

export interface PaginatedTemplatesResponse {
  items: ThumbnailTemplateRow[];
  total: number;
  page: number;
  limit: number;
}

export async function listTemplateNiches(token: string | null): Promise<TemplateNicheOption[]> {
  return fetchJson<TemplateNicheOption[]>('/templates/niches', token);
}

export async function listTemplates(
  token: string | null,
  options?: { niche?: string | null; page?: number; limit?: number },
): Promise<PaginatedTemplatesResponse> {
  const params = new URLSearchParams();
  if (options?.niche) params.set('niche', options.niche);
  if (options?.page != null && options.page > 1) params.set('page', String(options.page));
  if (options?.limit != null && options.limit !== TEMPLATES_DEFAULT_PAGE_SIZE) {
    params.set('limit', String(options.limit));
  }
  const q = params.toString();
  return fetchJson<PaginatedTemplatesResponse>(q ? `/templates?${q}` : '/templates', token);
}

export async function createTemplate(
  token: string | null,
  body: {
    name: string;
    slug: string;
    imageBase64: string;
    mimeType?: string;
    niche?: string;
  },
): Promise<ThumbnailTemplateRow> {
  return fetchJson<ThumbnailTemplateRow>('/templates', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
