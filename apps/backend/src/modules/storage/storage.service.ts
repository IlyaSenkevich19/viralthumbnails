import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export const BUCKET_PROJECT_THUMBNAILS = 'project-thumbnails';
export const BUCKET_THUMBNAIL_TEMPLATES = 'thumbnail-templates';
export const BUCKET_USER_AVATARS = 'user-avatars';

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
    /** When set, file is stored as `{userId}/{niche}/{slug}.ext` for filters + RLS (first folder is still user id). */
    niche?: string | null;
  }): Promise<{ path: string }> {
    const ext = extensionForMime(params.contentType);
    const nicheSeg = params.niche ? `${params.niche}/` : '';
    const path = `${params.userId}/${nicheSeg}${params.slug}.${ext}`;
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

  async uploadUserAvatarImage(params: {
    userId: string;
    avatarId: string;
    body: Buffer;
    contentType: string;
  }): Promise<{ path: string }> {
    const ext = extensionForMime(params.contentType);
    const path = `${params.userId}/avatars/${params.avatarId}.${ext}`;
    const client = this.supabase.getAdminClient();
    const { error } = await client.storage.from(BUCKET_USER_AVATARS).upload(path, params.body, {
      contentType: params.contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(`user-avatars upload: ${error.message}`);
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

  async removeObjectsIfPresent(bucket: string, paths: string[]): Promise<void> {
    const unique = [...new Set(paths.filter((p) => typeof p === 'string' && p.length > 0))];
    if (unique.length === 0) return;
    const client = this.supabase.getAdminClient();
    const { error } = await client.storage.from(bucket).remove(unique);
    if (error) {
      console.warn(`[storage] removeObjectsIfPresent: ${error.message}`);
    }
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
