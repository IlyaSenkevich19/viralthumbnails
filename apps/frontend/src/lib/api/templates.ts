import { fetchJson } from './fetch-json';

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

function templatesListPath(niche?: string | null): string {
  if (!niche) return '/templates';
  const q = new URLSearchParams({ niche });
  return `/templates?${q.toString()}`;
}

export async function listTemplateNiches(token: string | null): Promise<TemplateNicheOption[]> {
  return fetchJson<TemplateNicheOption[]>('/templates/niches', token);
}

export async function listTemplates(
  token: string | null,
  options?: { niche?: string | null },
): Promise<ThumbnailTemplateRow[]> {
  return fetchJson<ThumbnailTemplateRow[]>(templatesListPath(options?.niche ?? undefined), token);
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
