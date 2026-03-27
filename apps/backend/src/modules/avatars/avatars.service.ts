import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { BUCKET_USER_AVATARS, StorageService } from '../storage/storage.service';
import { CreateAvatarDto } from './dto/create-avatar.dto';

const ALLOWED_AVATAR_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

@Injectable()
export class AvatarsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  async listForUser(userId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('user_avatars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException(error.message);
    const rows = data ?? [];
    return Promise.all(rows.map((row) => this.attachPreviewUrl(row as Record<string, unknown>)));
  }

  async create(userId: string, dto: CreateAvatarDto) {
    const { buffer, mimeType } = this.decodeBase64Image(dto.imageBase64, dto.mimeType);
    const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_AVATAR_MIMES.has(normalizedMime)) {
      throw new BadRequestException('Only PNG, JPEG, or WebP images are allowed');
    }
    if (buffer.length > 8 * 1024 * 1024) {
      throw new BadRequestException('Image too large (max 8MB)');
    }

    const id = randomUUID();
    const contentType = normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime;
    const { path } = await this.storage.uploadUserAvatarImage({
      userId,
      avatarId: id,
      body: buffer,
      contentType,
    });

    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('user_avatars')
      .insert({
        id,
        user_id: userId,
        name: dto.name?.trim() || 'My face',
        storage_path: path,
        mime_type: contentType,
      })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return this.attachPreviewUrl(data as Record<string, unknown>);
  }

  async deleteForUser(avatarId: string, userId: string) {
    const client = this.supabase.getAdminClient();
    const { data: row, error: findErr } = await client
      .from('user_avatars')
      .select('id, storage_path')
      .eq('id', avatarId)
      .eq('user_id', userId)
      .maybeSingle();
    if (findErr) throw new InternalServerErrorException(findErr.message);
    if (!row) throw new NotFoundException('Avatar not found');

    const path = (row as { storage_path: string }).storage_path;
    await this.storage.removeObjectsIfPresent(BUCKET_USER_AVATARS, [path]);

    const { error: delErr } = await client
      .from('user_avatars')
      .delete()
      .eq('id', avatarId)
      .eq('user_id', userId);
    if (delErr) throw new InternalServerErrorException(delErr.message);
  }

  private async attachPreviewUrl(row: Record<string, unknown>) {
    const path = row.storage_path as string;
    if (!path) return row;
    try {
      const preview_url = await this.storage.createSignedUrl(BUCKET_USER_AVATARS, path);
      return { ...row, preview_url };
    } catch {
      return { ...row, preview_url: null };
    }
  }

  private decodeBase64Image(
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
}
