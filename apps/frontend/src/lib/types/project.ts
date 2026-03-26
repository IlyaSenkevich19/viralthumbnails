export type ProjectSourceType = 'youtube_url' | 'video' | 'script' | 'text';

export type ProjectStatus = 'draft' | 'pending' | 'generating' | 'done' | 'failed';

export type VariantStatus = 'pending' | 'generating' | 'done' | 'failed';

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  source_type: ProjectSourceType;
  source_data: Record<string, unknown>;
  status: ProjectStatus;
  cover_thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThumbnailVariantRow {
  id: string;
  project_id: string;
  generated_image_url: string | null;
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
  status: 'done' | 'failed';
  errorMessage?: string;
}

export interface GenerateThumbnailsResponse {
  variant_ids: string[];
  results: GenerateThumbnailResultDto[];
}
