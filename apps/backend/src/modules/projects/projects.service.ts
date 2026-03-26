import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AiService } from '../ai/ai.service';
import {
  BUCKET_PROJECT_THUMBNAILS,
  StorageService,
} from '../storage/storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('projects')
      .insert({
        user_id: userId,
        title: dto.title ?? 'Untitled project',
        platform: dto.platform ?? 'youtube',
        source_type: dto.source_type,
        source_data: dto.source_data,
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return this.signProjectRow(data as Record<string, unknown>);
  }

  async listForUser(userId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new InternalServerErrorException(error.message);
    const rows = data ?? [];
    return Promise.all(rows.map((r) => this.signProjectRow(r as Record<string, unknown>)));
  }

  async getByIdForUser(projectId: string, userId: string) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new NotFoundException('Project not found');
    return data;
  }

  async getWithVariants(projectId: string, userId: string) {
    const project = await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const { data: variants, error } = await client
      .from('thumbnail_variants')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    const signedVariants = await Promise.all(
      (variants ?? []).map((v) => this.signVariantRow(v as Record<string, unknown>)),
    );
    const signedProject = await this.signProjectRow(project as Record<string, unknown>);
    return { ...signedProject, thumbnail_variants: signedVariants };
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.source_data !== undefined) patch.source_data = dto.source_data;
    if (dto.cover_thumbnail_url !== undefined)
      patch.cover_thumbnail_url = dto.cover_thumbnail_url;
    const { data, error } = await client
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return this.signProjectRow(data as Record<string, unknown>);
  }

  async listVariants(projectId: string, userId: string) {
    await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const { data, error } = await client
      .from('thumbnail_variants')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    return Promise.all(
      (data ?? []).map((v) => this.signVariantRow(v as Record<string, unknown>)),
    );
  }

  async deleteProject(projectId: string, userId: string) {
    const project = await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const { data: variants, error: vErr } = await client
      .from('thumbnail_variants')
      .select('generated_image_storage_path')
      .eq('project_id', projectId);
    if (vErr) throw new InternalServerErrorException(vErr.message);

    const paths: string[] = [];
    const coverPath = (project as { cover_thumbnail_storage_path?: string | null })
      .cover_thumbnail_storage_path;
    if (typeof coverPath === 'string' && coverPath.length > 0) paths.push(coverPath);
    for (const row of variants ?? []) {
      const p = (row as { generated_image_storage_path?: string | null })
        .generated_image_storage_path;
      if (typeof p === 'string' && p.length > 0) paths.push(p);
    }

    await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, paths);

    const { error: delErr } = await client.from('projects').delete().eq('id', projectId).eq('user_id', userId);
    if (delErr) throw new InternalServerErrorException(delErr.message);
  }

  async deleteVariant(projectId: string, variantId: string, userId: string) {
    await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const { data: row, error: findErr } = await client
      .from('thumbnail_variants')
      .select('id, generated_image_storage_path')
      .eq('id', variantId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (findErr) throw new InternalServerErrorException(findErr.message);
    if (!row) throw new NotFoundException('Variant not found');

    const path = (row as { generated_image_storage_path?: string | null })
      .generated_image_storage_path;
    if (typeof path === 'string' && path.length > 0) {
      await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, [path]);
    }

    const { error: delErr } = await client
      .from('thumbnail_variants')
      .delete()
      .eq('id', variantId)
      .eq('project_id', projectId);
    if (delErr) throw new InternalServerErrorException(delErr.message);

    await this.reconcileProjectCover(projectId);
  }

  private async reconcileProjectCover(projectId: string): Promise<void> {
    const client = this.supabase.getAdminClient();
    const { data: variants, error } = await client
      .from('thumbnail_variants')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    const list = variants ?? [];
    let cover_thumbnail_storage_path: string | null = null;
    let cover_thumbnail_url: string | null = null;
    for (const v of list) {
      const row = v as {
        status: string;
        generated_image_storage_path?: string | null;
        generated_image_url?: string | null;
      };
      if (row.status !== 'done') continue;
      if (typeof row.generated_image_storage_path === 'string' && row.generated_image_storage_path.length > 0) {
        cover_thumbnail_storage_path = row.generated_image_storage_path;
        cover_thumbnail_url = null;
        break;
      }
      if (typeof row.generated_image_url === 'string' && row.generated_image_url.length > 0) {
        cover_thumbnail_storage_path = null;
        cover_thumbnail_url = row.generated_image_url;
        break;
      }
    }
    const now = new Date().toISOString();
    const { error: upErr } = await client
      .from('projects')
      .update({
        cover_thumbnail_storage_path,
        cover_thumbnail_url,
        updated_at: now,
      })
      .eq('id', projectId);
    if (upErr) throw new InternalServerErrorException(upErr.message);
  }

  async generateVariants(
    projectId: string,
    userId: string,
    templateId: string | undefined,
    count: number,
  ) {
    const project = await this.getByIdForUser(projectId, userId);
    const client = this.supabase.getAdminClient();
    const now = () => new Date().toISOString();

    await client
      .from('projects')
      .update({ status: 'generating', updated_at: now() })
      .eq('id', projectId);

    const createdIds: string[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const { data: row, error } = await client
          .from('thumbnail_variants')
          .insert({
            project_id: projectId,
            status: 'generating',
            template_id: templateId ?? null,
          })
          .select('id')
          .single();
        if (error || !row) {
          throw new Error(error?.message ?? 'Failed to create variant');
        }
        createdIds.push(row.id);
      }

      const results = [];
      for (const variantId of createdIds) {
        const result = await this.ai.generateThumbnailForProject({
          projectId,
          userId,
          variantId,
          templateId,
        });
        results.push(result);
      }

      const anyDone = results.some((r) => r.status === 'done');
      const firstDone = results.find((r) => r.status === 'done');

      let cover_thumbnail_storage_path: string | null =
        (project as { cover_thumbnail_storage_path?: string | null })
          .cover_thumbnail_storage_path ?? null;
      let cover_thumbnail_url: string | null =
        (project as { cover_thumbnail_url?: string | null }).cover_thumbnail_url ?? null;

      if (firstDone) {
        if (firstDone.storagePath) {
          cover_thumbnail_storage_path = firstDone.storagePath;
          cover_thumbnail_url = null;
        } else if (firstDone.imageUrl) {
          cover_thumbnail_url = firstDone.imageUrl;
          cover_thumbnail_storage_path = null;
        }
      }

      await client
        .from('projects')
        .update({
          status: anyDone ? 'done' : 'failed',
          cover_thumbnail_storage_path,
          cover_thumbnail_url,
          updated_at: now(),
        })
        .eq('id', projectId);

      return { variant_ids: createdIds, results };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      if (createdIds.length > 0) {
        await client
          .from('thumbnail_variants')
          .update({ status: 'failed', error_message: msg })
          .in('id', createdIds)
          .eq('status', 'generating');
      }
      await client
        .from('projects')
        .update({ status: 'failed', updated_at: now() })
        .eq('id', projectId);
      throw new InternalServerErrorException(msg);
    }
  }

  private async signProjectRow<T extends Record<string, unknown>>(row: T): Promise<T> {
    const path = row.cover_thumbnail_storage_path;
    if (typeof path === 'string' && path.length > 0) {
      try {
        const url = await this.storage.createSignedUrl(BUCKET_PROJECT_THUMBNAILS, path);
        return { ...row, cover_thumbnail_url: url } as T;
      } catch {
        return row;
      }
    }
    return row;
  }

  private async signVariantRow<T extends Record<string, unknown>>(row: T): Promise<T> {
    const path = row.generated_image_storage_path;
    if (typeof path === 'string' && path.length > 0) {
      try {
        const url = await this.storage.createSignedUrl(BUCKET_PROJECT_THUMBNAILS, path);
        return { ...row, generated_image_url: url } as T;
      } catch {
        return row;
      }
    }
    return row;
  }
}
