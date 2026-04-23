import type {
  GenerateThumbnailsResponse,
  ProjectRow,
  ProjectSourceType,
  ProjectWithVariants,
} from '@/lib/types/project';
import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

export async function listProjects(token: string | null): Promise<ProjectRow[]> {
  return fetchJson<ProjectRow[]>(ApiRoutes.projects.root, token);
}

export async function getProject(
  token: string | null,
  id: string,
): Promise<ProjectWithVariants> {
  return fetchJson<ProjectWithVariants>(ApiRoutes.projects.one(id), token);
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
  return fetchJson<ProjectRow>(ApiRoutes.projects.root, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateProject(
  token: string | null,
  id: string,
  body: {
    title?: string;
    status?: ProjectWithVariants['status'];
    source_data?: Record<string, unknown>;
    cover_thumbnail_url?: string | null;
  },
): Promise<ProjectRow> {
  return fetchJson<ProjectRow>(ApiRoutes.projects.one(id), token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function generateThumbnails(
  token: string | null,
  projectId: string,
  options?: {
    template_id?: string;
    avatar_id?: string;
    prioritize_face?: boolean;
    count?: number;
    /** `default` = no extra prompt constraint; `with_face` / `faceless` append explicit instructions. */
    face_in_thumbnail?: 'default' | 'with_face' | 'faceless';
    image_model_tier?: 'default' | 'premium';
  },
): Promise<GenerateThumbnailsResponse> {
  return fetchJson<GenerateThumbnailsResponse>(ApiRoutes.projects.generate(projectId), token, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

export async function deleteProject(token: string | null, projectId: string): Promise<void> {
  await fetchJson(ApiRoutes.projects.delete(projectId), token, { method: 'DELETE' });
}

export async function deleteVariant(
  token: string | null,
  projectId: string,
  variantId: string,
): Promise<void> {
  await fetchJson(ApiRoutes.projects.variant(projectId, variantId), token, { method: 'DELETE' });
}
