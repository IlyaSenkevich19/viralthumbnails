import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BUCKET_THUMBNAIL_TEMPLATES,
  StorageService,
} from '../storage/storage.service';
import { CreateTemplateDto } from './dto/create-template.dto';

/** Files in Storage without a `thumbnail_templates` row still appear in the API (e.g. manual Dashboard uploads). */
@Injectable()
export class TemplatesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  async listForUser(userId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('thumbnail_templates')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    const rows = data ?? [];
    const dbPaths = new Set(rows.map((r) => r.storage_path as string));

    const fromStorage = await this.listTemplateImagePaths(userId);
    const orphanPaths = fromStorage.filter((f) => !dbPaths.has(f.path));
    const synthetic = orphanPaths.map((f) => this.rowFromStorageObject(f, userId));

    const combined = [...rows, ...synthetic].sort((a, b) => {
      const ta = String(a.created_at ?? '');
      const tb = String(b.created_at ?? '');
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.storage_path).localeCompare(String(b.storage_path));
    });

    return Promise.all(combined.map((row) => this.attachPreviewUrl(row)));
  }

  /** Lists image objects under `system/`, `{userId}/`, and bucket root (Dashboard uploads often land there). */
  private async listTemplateImagePaths(
    userId: string,
  ): Promise<{ path: string; mimeType: string; updatedAt: string }[]> {
    const client = this.supabase.getAdminClient();
    const bucket = client.storage.from(BUCKET_THUMBNAIL_TEMPLATES);
    const byPath = new Map<string, { path: string; mimeType: string; updatedAt: string }>();

    const visitPrefix = async (prefix: string) => {
      const { data, error } = await bucket.list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error || !data?.length) return;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        const isFolder = item.id === null;
        if (isFolder) {
          await visitPrefix(path);
        } else {
          const mime = mimeFromStorageItem(item.name, item.metadata as Record<string, unknown> | null);
          if (!mime.startsWith('image/')) continue;
          const updatedAt = item.updated_at ?? item.created_at ?? new Date().toISOString();
          byPath.set(path, { path, mimeType: mime, updatedAt });
        }
      }
    };

    await visitPrefix('system');
    await visitPrefix(userId);

    const { data: rootList, error: rootErr } = await bucket.list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (!rootErr && rootList) {
      for (const item of rootList) {
        if (item.id === null) continue;
        const mime = mimeFromStorageItem(item.name, item.metadata as Record<string, unknown> | null);
        if (!mime.startsWith('image/')) continue;
        const path = item.name;
        const updatedAt = item.updated_at ?? item.created_at ?? new Date().toISOString();
        byPath.set(path, { path, mimeType: mime, updatedAt });
      }
    }

    return [...byPath.values()];
  }

  private rowFromStorageObject(
    file: { path: string; mimeType: string; updatedAt: string },
    userId: string,
  ): Record<string, unknown> {
    const base = file.path.split('/').pop() ?? file.path;
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const slug = slugifyForTemplate(stem);
    const isSystem = file.path.startsWith('system/');
    const underUser = file.path.startsWith(`${userId}/`);
    const owner = isSystem || !underUser ? null : userId;
    return {
      id: syntheticTemplateId(file.path),
      user_id: owner,
      name: humanizeStem(stem),
      slug,
      storage_path: file.path,
      mime_type: file.mimeType,
      created_at: file.updatedAt,
      updated_at: file.updatedAt,
    };
  }

  async create(userId: string, dto: CreateTemplateDto) {
    const { buffer, mimeType } = decodeBase64Image(dto.imageBase64, dto.mimeType);
    if (buffer.length > 15 * 1024 * 1024) {
      throw new BadRequestException('Image too large (max 15MB)');
    }

    const client = this.supabase.getAdminClient();
    const { data: existing } = await client
      .from('thumbnail_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', dto.slug)
      .maybeSingle();
    if (existing) {
      throw new ConflictException('Template slug already exists for your account');
    }

    const { path } = await this.storage.uploadUserTemplateImage({
      userId,
      slug: dto.slug,
      body: buffer,
      contentType: mimeType,
    });

    const { data, error } = await client
      .from('thumbnail_templates')
      .insert({
        user_id: userId,
        name: dto.name,
        slug: dto.slug,
        storage_path: path,
        mime_type: mimeType,
      })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return this.attachPreviewUrl(data);
  }

  private async attachPreviewUrl(row: Record<string, unknown>) {
    const path = row.storage_path as string;
    if (!path) return row;
    try {
      const preview_url = await this.storage.createSignedUrl(
        BUCKET_THUMBNAIL_TEMPLATES,
        path,
      );
      return { ...row, preview_url };
    } catch {
      return { ...row, preview_url: null };
    }
  }
}

function syntheticTemplateId(storagePath: string): string {
  const h = createHash('sha256').update(`thumbnail_templates:${storagePath}`).digest('hex');
  return `st-${h.slice(0, 32)}`;
}

function slugifyForTemplate(stem: string): string {
  const s = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'template';
}

function humanizeStem(stem: string): string {
  const s = stem.replace(/[-_]+/g, ' ').trim();
  return s || 'Template';
}

function mimeFromStorageItem(
  name: string,
  metadata: Record<string, unknown> | null,
): string {
  if (metadata && typeof metadata === 'object') {
    const m =
      (metadata.mimetype as string) ||
      (metadata['content-type'] as string) ||
      (metadata.contentType as string);
    if (typeof m === 'string' && m.trim()) return m.trim().split(';')[0].toLowerCase();
  }
  return guessMimeFromFilename(name);
}

function guessMimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

function decodeBase64Image(
  input: string,
  mimeHint?: string,
): { buffer: Buffer; mimeType: string } {
  let raw = input.trim();
  let mimeType = mimeHint?.trim() || 'image/png';
  const dataUrl = /^data:([^;]+);base64,(.+)$/is.exec(raw);
  if (dataUrl) {
    mimeType = dataUrl[1].trim();
    raw = dataUrl[2].replace(/\s/g, '');
  } else {
    raw = raw.replace(/\s/g, '');
  }
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) {
    throw new BadRequestException('Invalid base64 image');
  }
  return { buffer, mimeType };
}
