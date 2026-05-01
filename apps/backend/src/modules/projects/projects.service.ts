import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BUCKET_PROJECT_THUMBNAILS,
  StorageService,
} from '../storage/storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { inferProjectTitle } from './infer-project-title';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ThumbnailPipelineJobsService } from '../thumbnail-pipeline/services/thumbnail-pipeline-jobs.service';
import { ThumbnailPipelineRunDto } from '../thumbnail-pipeline/dto/thumbnail-pipeline-run.dto';
import { VideoPipelineDurationGateService } from '../video-thumbnails/services/video-pipeline-duration-gate.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly pipelineJobs: ThumbnailPipelineJobsService,
    private readonly videoDurationGate: VideoPipelineDurationGateService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const client = this.supabase.getAdminClient();
    const title = inferProjectTitle({
      explicitTitle: dto.title,
      sourceData: dto.source_data ?? {},
    });
    const { data, error } = await client
      .from('projects')
      .insert({
        user_id: userId,
        title,
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
    const sourceData = (project as { source_data?: Record<string, unknown> | null }).source_data ?? {};
    const videoTempPath = sourceData.video_temp_storage_path;
    if (typeof videoTempPath === 'string' && videoTempPath.length > 0) paths.push(videoTempPath);
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
    avatarId?: string,
    prioritizeFace?: boolean,
    opts?: {
      faceInThumbnail?: 'default' | 'with_face' | 'faceless';
      imageModelTier?: 'default' | 'premium';
    },
  ) {
    const project = await this.getByIdForUser(projectId, userId);
    const activeJob = await this.pipelineJobs.findActiveForUser(userId);
    if (activeJob) {
      throw new ConflictException({
        code: 'PIPELINE_JOB_ALREADY_ACTIVE',
        message: 'A pipeline generation is already in progress. Please wait until it finishes.',
      });
    }

    const faceInThumbnail = opts?.faceInThumbnail ?? 'default';
    const avatarForPipeline = faceInThumbnail === 'faceless' ? undefined : avatarId?.trim() || undefined;
    const effectivePrioritizeFace = Boolean(avatarForPipeline) || Boolean(prioritizeFace);
    const body = await this.buildPipelineBodyForProject({
      project: project as Record<string, unknown>,
      projectId,
      templateId,
      avatarId: avatarForPipeline,
      prioritizeFace: effectivePrioritizeFace,
      count,
      imageModelTier: opts?.imageModelTier,
      faceInThumbnail,
    });
    const videoContext = body.video_url?.trim()
      ? await this.videoDurationGate.resolveContextAndEnforceForPipeline({
          videoUrl: body.video_url.trim(),
          logContext: 'projects/generate',
        })
      : undefined;

    const job = await this.pipelineJobs.enqueue({
      userId,
      payload: {
        source: 'run',
        body,
        videoContext,
        projectId,
      },
    });
    await this.pipelineJobs.updateProjectPipelineState({
      userId,
      projectId,
      status: 'generating',
      pipelineJobId: job.id,
      progress: { stage: 'queued', label: 'Queued' },
      errorMessage: null,
      sourceDataPatch: {
        last_template_id: templateId ?? null,
        last_avatar_id: avatarForPipeline ?? null,
        last_prioritize_face: effectivePrioritizeFace,
        last_variant_count: body.variant_count,
        last_face_in_thumbnail: faceInThumbnail,
      },
    });

    return {
      job_id: job.id,
      status: job.status,
      created_at: job.created_at,
    };
  }

  private async buildPipelineBodyForProject(params: {
    project: Record<string, unknown>;
    projectId: string;
    templateId?: string;
    avatarId?: string;
    prioritizeFace: boolean;
    count: number;
    imageModelTier?: 'default' | 'premium';
    faceInThumbnail: 'default' | 'with_face' | 'faceless';
  }): Promise<ThumbnailPipelineRunDto> {
    const sourceData = (params.project.source_data as Record<string, unknown> | null) ?? {};
    const sourceType = typeof params.project.source_type === 'string' ? params.project.source_type : 'text';
    const title = String(params.project.title ?? 'Untitled project').trim() || 'Untitled project';
    const videoUrl = await this.resolveProjectVideoUrl(sourceData);
    const prompt = this.buildProjectPipelinePrompt({ title, sourceType, sourceData });
    const styleParts = [
      sourceType === 'youtube_url'
        ? 'YouTube URL context'
        : sourceType === 'video'
          ? 'Uploaded video context'
          : 'Prompt-only thumbnail concept',
      params.faceInThumbnail === 'faceless'
        ? 'Faceless thumbnail: do not use human portraits or recognizable template faces.'
        : params.avatarId
          ? 'Selected face reference is the likeness source for the main person. Do not copy the person from the template.'
          : params.faceInThumbnail === 'with_face'
            ? 'Include a clear on-camera human face when the source supports it.'
            : '',
    ].filter(Boolean);

    return {
      user_prompt: prompt,
      style: styleParts.join(' '),
      video_url: videoUrl,
      template_id: params.templateId,
      avatar_id: params.avatarId,
      variant_count: Math.min(12, Math.max(1, Math.floor(params.count) || 1)),
      generate_images: true,
      image_model_tier: params.imageModelTier ?? 'default',
      prioritize_face: params.prioritizeFace,
      persist_project: true,
      project_id: params.projectId,
    };
  }

  private async resolveProjectVideoUrl(sourceData: Record<string, unknown>): Promise<string | undefined> {
    const tempPath = sourceData.video_temp_storage_path;
    if (typeof tempPath === 'string' && tempPath.trim().length > 0) {
      return this.storage.createSignedUrl(BUCKET_PROJECT_THUMBNAILS, tempPath.trim());
    }
    const candidates = [sourceData.video_url, sourceData.url];
    for (const raw of candidates) {
      if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
    }
    return undefined;
  }

  private buildProjectPipelinePrompt(params: {
    title: string;
    sourceType: string;
    sourceData: Record<string, unknown>;
  }): string {
    const parts = [
      `Generate high-CTR YouTube thumbnails for project: ${params.title}.`,
      `Source type: ${params.sourceType}.`,
    ];
    const videoMeta = params.sourceData.video_meta as Record<string, unknown> | undefined;
    const sourceTitle = this.readFirstString(params.sourceData.title, videoMeta?.title);
    const author = this.readFirstString(params.sourceData.author, videoMeta?.author);
    const text = this.readFirstString(
      params.sourceData.text,
      params.sourceData.prompt,
      params.sourceData.script,
      params.sourceData.user_prompt,
    );
    const fileName = this.readFirstString(params.sourceData.file_name);
    if (sourceTitle) parts.push(`Video title: ${sourceTitle}.`);
    if (author) parts.push(`Channel/author: ${author}.`);
    if (fileName) parts.push(`Uploaded file: ${fileName}.`);
    if (text) parts.push(`Creator prompt/context: ${text.slice(0, 1200)}.`);
    parts.push(
      'Build a truthful YouTube thumbnail concept. Use the source video or prompt as the story, template only as layout, and selected face only as likeness reference when provided.',
    );
    return parts.join(' ').slice(0, 8000);
  }

  private readFirstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
    return undefined;
  }

  private signProjectRow<T extends Record<string, unknown>>(row: T): Promise<T> {
    return this.storage.attachSignedObjectUrl(
      row,
      BUCKET_PROJECT_THUMBNAILS,
      'cover_thumbnail_storage_path',
      'cover_thumbnail_url',
    );
  }

  private signVariantRow<T extends Record<string, unknown>>(row: T): Promise<T> {
    return this.storage.attachSignedObjectUrl(
      row,
      BUCKET_PROJECT_THUMBNAILS,
      'generated_image_storage_path',
      'generated_image_url',
    );
  }
}
