import { fetchJson } from './fetch-json';

export interface UserAvatarRow {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
  preview_url?: string | null;
}

export async function listAvatars(token: string | null): Promise<UserAvatarRow[]> {
  return fetchJson<UserAvatarRow[]>('/avatars', token);
}

export async function createAvatar(
  token: string | null,
  body: { name?: string; imageBase64: string; mimeType?: string },
): Promise<UserAvatarRow> {
  return fetchJson<UserAvatarRow>('/avatars', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteAvatar(token: string | null, id: string): Promise<void> {
  return fetchJson<void>(`/avatars/${id}`, token, { method: 'DELETE' });
}
