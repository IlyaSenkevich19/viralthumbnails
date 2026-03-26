import type {
  GenerateThumbnailsResponse,
  ProjectRow,
  ProjectSourceType,
  ProjectWithVariants,
  ThumbnailVariantRow,
} from '@/lib/types/project';
import { fetchJson } from './fetch-json';

export async function listProjects(token: string | null): Promise<ProjectRow[]> {
  return fetchJson<ProjectRow[]>('/projects', token);
}

export async function getProject(
  token: string | null,
  id: string,
): Promise<ProjectWithVariants> {
  return fetchJson<ProjectWithVariants>(`/projects/${id}`, token);
}

export async function createProject(
  token: string | null,
  body: {
    title?: string;
    platform?: string;
    source_type: ProjectSourceType;
    source_data: Record<string, unknown>;
  },
): Promise<ProjectRow> {
  return fetchJson<ProjectRow>('/projects', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function generateThumbnails(
  token: string | null,
  projectId: string,
  options?: { template_id?: string; count?: number },
): Promise<GenerateThumbnailsResponse> {
  return fetchJson<GenerateThumbnailsResponse>(`/projects/${projectId}/generate`, token, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

export async function listVariants(
  token: string | null,
  projectId: string,
): Promise<ThumbnailVariantRow[]> {
  return fetchJson<ThumbnailVariantRow[]>(`/projects/${projectId}/variants`, token);
}
