export type ProjectSourceType = 'youtube_url' | 'video' | 'script' | 'text';

export type ProjectStatus = 'draft' | 'pending' | 'generating' | 'done' | 'failed';

export type VariantStatus = 'pending' | 'generating' | 'done' | 'failed';

export function isOptimisticProjectId(id: string): boolean {
  return id.startsWith('optimistic:');
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  source_type: ProjectSourceType;
  source_data: Record<string, unknown>;
  status: ProjectStatus;
  cover_thumbnail_url: string | null;
  cover_thumbnail_storage_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedProjectsResponse {
  items: ProjectRow[];
  total: number;
  page: number;
  limit: number;
}

export interface ThumbnailVariantRow {
  id: string;
  project_id: string;
  generated_image_url: string | null;
  /** Present when the file lives in Storage; API still returns a signed `generated_image_url`. */
  generated_image_storage_path?: string | null;
  status: VariantStatus;
  template_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ProjectWithVariants extends ProjectRow {
  thumbnail_variants: ThumbnailVariantRow[];
}

export interface GenerateThumbnailResultDto {
  variantId: string;
  imageUrl: string | null;
  storagePath?: string | null;
  status: 'done' | 'failed';
  errorMessage?: string;
}

export interface GenerateThumbnailsResponse {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  created_at: string;
}

export interface RefineThumbnailResponse {
  variant: ThumbnailVariantRow;
}
