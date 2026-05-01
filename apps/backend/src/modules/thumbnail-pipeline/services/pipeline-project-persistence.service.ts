import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../../storage/storage.service';
import type { PipelineVideoContext } from '../../video-thumbnails/types/video-pipeline-video-context';
import type { ThumbnailPipelineRunInput, ThumbnailPipelineRunResult } from '../types/thumbnail-pipeline-run.types';

export type PersistedPipelineVariant = {
  index: number;
  prompt: string;
  storagePath: string;
  signedUrl: string;
};

export type PersistedPipelineProject = {
  projectId: string;
  variants: PersistedPipelineVariant[];
};

@Injectable()
export class PipelineProjectPersistenceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
  ) {}

  async persist(params: {
    userId: string;
    runInput: ThumbnailPipelineRunInput;
    runResult: ThumbnailPipelineRunResult;
    videoContext?: PipelineVideoContext;
  }): Promise<PersistedPipelineProject> {
    const variants = params.runResult.variants ?? [];
    if (variants.length === 0) {
      throw new Error('Cannot persist pipeline run without generated variants');
    }

    const uploaded: PersistedPipelineVariant[] = [];
    try {
      for (const v of variants) {
        const saved = await this.storage.uploadPipelineThumbnailOutput({
          userId: params.userId,
          runId: params.runResult.runId,
          index: v.index,
          body: v.buffer,
          contentType: v.contentType,
        });
        uploaded.push({
          index: v.index,
          prompt: v.prompt,
          storagePath: saved.path,
          signedUrl: saved.signedUrl,
        });
      }

      const projectId = params.runInput.projectId
        ? await this.updateExistingProject({
            projectId: params.runInput.projectId,
            userId: params.userId,
            runInput: params.runInput,
            runResult: params.runResult,
            videoContext: params.videoContext,
            coverThumbnailStoragePath: uploaded[0]?.storagePath ?? null,
          })
        : await this.insertProject({
            userId: params.userId,
            runInput: params.runInput,
            runResult: params.runResult,
            videoContext: params.videoContext,
            coverThumbnailStoragePath: uploaded[0]?.storagePath ?? null,
          });

      await this.insertVariants(projectId, uploaded, params.runInput.templateId);

      return { projectId, variants: uploaded };
    } catch (error) {
      await this.storage.removeObjectsIfPresent(
        BUCKET_PROJECT_THUMBNAILS,
        uploaded.map((v) => v.storagePath),
      );
      throw error;
    }
  }

  private async insertProject(params: {
    userId: string;
    runInput: ThumbnailPipelineRunInput;
    runResult: ThumbnailPipelineRunResult;
    videoContext?: PipelineVideoContext;
    coverThumbnailStoragePath: string | null;
  }): Promise<string> {
    const client = this.supabase.getAdminClient();
    const sceneSummary = params.runResult.analysis.sceneSummary.trim();
    const titleBase = sceneSummary.length ? sceneSummary : params.runInput.userPrompt.trim();
    const title = (titleBase || 'Pipeline thumbnails').slice(0, 200);
    const sourceType = params.runInput.videoUrl?.trim() ? 'video' : 'text';

    const sourceData = {
      pipeline_run_id: params.runResult.runId,
      user_prompt: params.runInput.userPrompt,
      style: params.runInput.style ?? undefined,
      video_url: params.runInput.videoUrl ?? undefined,
      template_reference_data_urls: params.runInput.templateReferenceDataUrls ?? undefined,
      template_id: params.runInput.templateId ?? undefined,
      face_reference_data_urls: params.runInput.faceReferenceDataUrls ?? undefined,
      avatar_id: params.runInput.avatarId ?? undefined,
      variant_count: params.runInput.variantCount ?? undefined,
      prioritize_face: params.runInput.prioritizeFace ?? undefined,
      generated_models: params.runResult.modelsUsed,
      scene_summary_excerpt: sceneSummary.slice(0, 500),
      video_context: params.videoContext ?? undefined,
      video_analysis: params.runResult.videoAnalysis ?? undefined,
    };

    const { data: project, error } = await client
      .from('projects')
      .insert({
        user_id: params.userId,
        title,
        platform: 'youtube',
        source_type: sourceType,
        source_data: sourceData,
        status: 'done',
        cover_thumbnail_storage_path: params.coverThumbnailStoragePath,
        cover_thumbnail_url: null,
      })
      .select('id')
      .single();

    if (error || !project?.id) {
      throw new Error(error?.message ?? 'Failed to create project from pipeline run');
    }
    return project.id as string;
  }

  private async updateExistingProject(params: {
    projectId: string;
    userId: string;
    runInput: ThumbnailPipelineRunInput;
    runResult: ThumbnailPipelineRunResult;
    videoContext?: PipelineVideoContext;
    coverThumbnailStoragePath: string | null;
  }): Promise<string> {
    const client = this.supabase.getAdminClient();
    const sceneSummary = params.runResult.analysis.sceneSummary.trim();
    const sourceDataPatch = {
      pipeline_run_id: params.runResult.runId,
      template_id: params.runInput.templateId ?? undefined,
      avatar_id: params.runInput.avatarId ?? undefined,
      generated_models: params.runResult.modelsUsed,
      scene_summary_excerpt: sceneSummary.slice(0, 500),
      video_context: params.videoContext ?? undefined,
      video_analysis: params.runResult.videoAnalysis ?? undefined,
      pipeline_error: null,
    };
    const { data: existing, error: readErr } = await client
      .from('projects')
      .select('source_data')
      .eq('id', params.projectId)
      .eq('user_id', params.userId)
      .maybeSingle();
    if (readErr || !existing) {
      throw new Error(readErr?.message ?? 'Failed to load existing project for pipeline persistence');
    }
    const mergedSourceData = {
      ...((existing.source_data as Record<string, unknown> | null) ?? {}),
      ...sourceDataPatch,
    };
    const { error } = await client
      .from('projects')
      .update({
        source_data: mergedSourceData,
        status: 'done',
        cover_thumbnail_storage_path: params.coverThumbnailStoragePath,
        cover_thumbnail_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.projectId)
      .eq('user_id', params.userId);
    if (error) {
      throw new Error(error.message);
    }
    return params.projectId;
  }

  private async insertVariants(
    projectId: string,
    variants: PersistedPipelineVariant[],
    templateId?: string,
  ): Promise<void> {
    const client = this.supabase.getAdminClient();
    for (const v of variants) {
      const { error } = await client.from('thumbnail_variants').insert({
        project_id: projectId,
        status: 'done',
        template_id: templateId ?? null,
        generated_image_storage_path: v.storagePath,
        generated_image_url: null,
        error_message: null,
      });
      if (error) {
        throw new Error(error.message);
      }
    }
  }
}
