import { fetchJson } from './fetch-json';

export interface ThumbnailTemplateRow {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
  preview_url?: string | null;
}

export async function listTemplates(token: string | null): Promise<ThumbnailTemplateRow[]> {
  return fetchJson<ThumbnailTemplateRow[]>('/templates', token);
}

export async function createTemplate(
  token: string | null,
  body: { name: string; slug: string; imageBase64: string; mimeType?: string },
): Promise<ThumbnailTemplateRow> {
  return fetchJson<ThumbnailTemplateRow>('/templates', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
