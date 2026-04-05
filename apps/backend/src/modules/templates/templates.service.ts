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
import { decodeBase64Image } from '@/common/images/decode-base64-image';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TEMPLATE_NICHE_CODE_LIST } from './constants/template-niches';
import { inferNicheFromTemplatePath } from './lib/infer-niche-from-path';

type StorageTemplatePath = { path: string; mimeType: string; updatedAt: string };

@Injectable()
export class TemplatesService {
  private readonly storagePathsCache = new Map<string, { expiresAt: number; paths: StorageTemplatePath[] }>();
  private static readonly STORAGE_PATHS_TTL_MS = 60_000;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  async listForUser(
    userId: string,
    nicheFilter?: string,
    pagination?: { page: number; limit: number },
  ): Promise<{
    items: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('thumbnail_templates')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    const rows = data ?? [];
    const dbPaths = new Set(rows.map((r) => r.storage_path as string));

    const fromStorage = await this.listTemplateImagePathsCached(userId);
    const orphanPaths = fromStorage.filter((f) => !dbPaths.has(f.path));
    const synthetic = orphanPaths.map((f) => this.rowFromStorageObject(f, userId));

    let combined = [...rows, ...synthetic].sort((a, b) => {
      const ta = String(a.created_at ?? '');
      const tb = String(b.created_at ?? '');
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.storage_path).localeCompare(String(b.storage_path));
    });

    if (nicheFilter) {
      combined = combined.filter((row) => (row.niche as string | null | undefined) === nicheFilter);
    }

    const total = combined.length;
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 24));
    const start = (page - 1) * limit;
    const pageRows = combined.slice(start, start + limit);
    const items = await Promise.all(pageRows.map((row) => this.attachPreviewUrl(row)));

    return { items, total, page, limit };
  }

  async resolveTemplateForGeneration(
    userId: string,
    templateId: string,
  ): Promise<{ storagePath: string; mimeType: string } | null> {
    const client = this.supabase.getAdminClient();
    const isUuid =
      templateId.length === 36 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
    if (isUuid) {
      const { data, error } = await client
        .from('thumbnail_templates')
        .select('storage_path, mime_type')
        .eq('id', templateId)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .maybeSingle();
      if (error || !data?.storage_path) return null;
      return {
        storagePath: data.storage_path as string,
        mimeType: (data.mime_type as string) || 'image/png',
      };
    }
    if (templateId.startsWith('st-')) {
      const paths = await this.listTemplateImagePathsCached(userId);
      for (const p of paths) {
        if (syntheticTemplateId(p.path) === templateId) {
          return { storagePath: p.path, mimeType: p.mimeType };
        }
      }
    }
    return null;
  }

  /**
   * Lists images under `system/`, root niche folders (`cooking/`, `vlog/`, …), `{userId}/`,
   * and loose files at bucket root.
   */
  private async collectTemplateImagePathsFromStorage(userId: string): Promise<StorageTemplatePath[]> {
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
    for (const nicheCode of TEMPLATE_NICHE_CODE_LIST) {
      await visitPrefix(nicheCode);
    }

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
      niche: inferNicheFromTemplatePath(file.path),
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
      niche: dto.niche ?? null,
    });

    const { data, error } = await client
      .from('thumbnail_templates')
      .insert({
        user_id: userId,
        name: dto.name,
        slug: dto.slug,
        storage_path: path,
        mime_type: mimeType,
        niche: dto.niche ?? null,
      })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    this.storagePathsCache.delete(userId);
    return this.attachPreviewUrl(data);
  }

  private async listTemplateImagePathsCached(userId: string): Promise<StorageTemplatePath[]> {
    const now = Date.now();
    const hit = this.storagePathsCache.get(userId);
    if (hit && hit.expiresAt > now) return hit.paths;
    const paths = await this.collectTemplateImagePathsFromStorage(userId);
    this.storagePathsCache.set(userId, { expiresAt: now + TemplatesService.STORAGE_PATHS_TTL_MS, paths });
    return paths;
  }

  private attachPreviewUrl(row: Record<string, unknown>) {
    return this.storage.attachSignedObjectUrl(
      row,
      BUCKET_THUMBNAIL_TEMPLATES,
      'storage_path',
      'preview_url',
      { nullUrlOnSignError: true },
    );
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
