import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export const BUCKET_PROJECT_THUMBNAILS = 'project-thumbnails';
export const BUCKET_THUMBNAIL_TEMPLATES = 'thumbnail-templates';

@Injectable()
export class StorageService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  signExpiresSeconds(): number {
    const raw = this.config.get<string>('SUPABASE_STORAGE_SIGN_EXPIRES_SEC');
    const n = raw ? parseInt(raw, 10) : 3600;
    return Number.isFinite(n) && n > 60 ? n : 3600;
  }

  async uploadProjectVariantImage(params: {
    userId: string;
    projectId: string;
    variantId: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ path: string }> {
    const ext = extensionForMime(params.contentType);
    const path = `${params.userId}/${params.projectId}/variants/${params.variantId}.${ext}`;
    const client = this.supabase.getAdminClient();
    const { error } = await client.storage.from(BUCKET_PROJECT_THUMBNAILS).upload(path, params.body, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(`project-thumbnails upload: ${error.message}`);
    }
    return { path };
  }

  async uploadUserTemplateImage(params: {
    userId: string;
    slug: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ path: string }> {
    const ext = extensionForMime(params.contentType);
    const path = `${params.userId}/${params.slug}.${ext}`;
    const client = this.supabase.getAdminClient();
    const { error } = await client.storage.from(BUCKET_THUMBNAIL_TEMPLATES).upload(path, params.body, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(`thumbnail-templates upload: ${error.message}`);
    }
    return { path };
  }

  async createSignedUrl(bucket: string, objectPath: string): Promise<string> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(objectPath, this.signExpiresSeconds());
    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'createSignedUrl failed');
    }
    return data.signedUrl;
  }
}

function extensionForMime(mime: string): string {
  const m = mime.toLowerCase().split(';')[0].trim();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return 'bin';
}
