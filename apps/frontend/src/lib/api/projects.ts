import type {
  GenerateThumbnailsResponse,
  PaginatedProjectsResponse,
  ProjectRow,
  ProjectSourceType,
  ProjectWithVariants,
  RefineThumbnailResponse,
} from '@/lib/types/project';
import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

/** Default matches backend `GET /projects`. Keep options within backend `@Max(100)`. */
export const PROJECTS_DEFAULT_PAGE_SIZE = 24;

export const PROJECTS_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
export type ProjectsPageSizeOption = (typeof PROJECTS_PAGE_SIZE_OPTIONS)[number];

export function parseProjectsPageSizeParam(raw: string | null): number {
  if (raw == null || raw === '') return PROJECTS_DEFAULT_PAGE_SIZE;
  const n = parseInt(raw, 10);
  return (PROJECTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : PROJECTS_DEFAULT_PAGE_SIZE;
}

export async function listProjects(
  token: string | null,
  options?: { page?: number; limit?: number; q?: string },
): Promise<PaginatedProjectsResponse> {
  const params = new URLSearchParams();
  if (options?.page != null) params.set('page', String(options.page));
  if (options?.limit != null) params.set('limit', String(options.limit));
  const q = typeof options?.q === 'string' ? options.q.trim() : '';
  if (q.length > 0) params.set('q', q);
  const qs = params.toString();
  const path = qs ? `${ApiRoutes.projects.root}?${qs}` : ApiRoutes.projects.root;
  return fetchJson<PaginatedProjectsResponse>(path, token);
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

export async function refineThumbnailVariant(
  token: string | null,
  projectId: string,
  variantId: string,
  body: {
    instruction: string;
    template_id?: string;
    avatar_id?: string;
  },
): Promise<RefineThumbnailResponse> {
  return fetchJson<RefineThumbnailResponse>(ApiRoutes.projects.refineVariant(projectId, variantId), token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
