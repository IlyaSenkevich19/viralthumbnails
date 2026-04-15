import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BillingService } from '../billing/billing.service';
import { ProjectVariantImageService } from '../project-thumbnail-generation/project-variant-image.service';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../storage/storage.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { UploadedVideoFile } from './types/upload.types';
import { VideoIngestionService } from './services/video-ingestion.service';
import { VideoAnalysisService } from './services/video-analysis.service';
import { ThumbnailGenerationService } from './services/thumbnail-generation.service';
import { ThumbnailRankingService } from './services/thumbnail-ranking.service';
import { YoutubeVideoMetaService } from './services/youtube-video-meta.service';
import type { VideoAnalysis } from './schemas/video-analysis.schema';
import type { RankedThumbnail } from './services/thumbnail-ranking.service';

export type FromVideoThumbnailOutput = {
  runId: string;
  projectId: string;
  analysis: VideoAnalysis;
  selectedShots: VideoAnalysis['bestScenes'];
  thumbnails: Array<{
    rank: number;
    storagePath: string;
    signedUrl: string;
    prompt: string;
    seedIndex: number;
    scores: RankedThumbnail['scores'];
  }>;
};

@Injectable()
export class FromVideoThumbnailsService {
  private readonly logger = new Logger(FromVideoThumbnailsService.name);

  constructor(
    private readonly ingestion: VideoIngestionService,
    private readonly analysis: VideoAnalysisService,
    private readonly generation: ThumbnailGenerationService,
    private readonly ranking: ThumbnailRankingService,
    private readonly youtubeMeta: YoutubeVideoMetaService,
    private readonly storage: StorageService,
    private readonly billing: BillingService,
    private readonly supabase: SupabaseService,
    private readonly projectVariantImage: ProjectVariantImageService,
  ) {}

  async run(params: {
    userId: string;
    videoUrl?: string;
    file?: UploadedVideoFile;
    count?: number;
    style?: string;
    prompt?: string;
    template_id?: string;
    avatar_id?: string;
    prioritize_face?: boolean;
  }): Promise<FromVideoThumbnailOutput> {
    const runId = randomUUID();
    const count = Math.min(12, Math.max(1, params.count ?? 4));
    const creditCost = this.billing.videoPipelineCreditCost(count);
    await this.billing.reserveGenerationCredits(params.userId, creditCost, {
      referenceType: 'from_video_run',
      referenceId: runId,
    });

    let tempPath: string | undefined;

    try {
      const source = await this.ingestion.resolve({
        userId: params.userId,
        runId,
        videoUrl: params.videoUrl,
        file: params.file,
      });
      tempPath = source.tempStoragePath;

      this.logger.log(`from-video runId=${runId} source=${tempPath ? 'upload' : 'url'}`);

      const analysisResult = await this.analysis.analyze(source.url, params.style, params.prompt);

      const refs = await this.projectVariantImage.resolveReferenceDataUrlsForUser({
        userId: params.userId,
        templateId: params.template_id,
        avatarId: params.avatar_id,
        logContext: `from-video ${runId}`,
      });

      const candidates = await this.generation.generateCandidates({
        analysis: analysisResult,
        count,
        style: params.style,
        creativePrompt: params.prompt,
        referenceImages:
          refs.dataUrls.length > 0
            ? {
                dataUrls: refs.dataUrls,
                hasTemplateImage: refs.hasTemplateImage,
                hasAvatarImage: refs.hasAvatarImage,
                prioritizeFace: Boolean(params.prioritize_face) && refs.hasAvatarImage,
              }
            : undefined,
      });

      if (candidates.length === 0) {
        throw new Error('No thumbnails were generated (check OPENROUTER_API_KEY, OPENROUTER_STACK.imageModel in openrouter-models.ts, and response format)');
      }

      const ranked = await this.ranking.rankCandidates(candidates);

      const thumbnails: FromVideoThumbnailOutput['thumbnails'] = [];
      let saveIndex = 0;
      for (const r of ranked) {
        const uploaded = await this.storage.uploadFromVideoThumbnailOutput({
          userId: params.userId,
          runId,
          index: saveIndex,
          body: r.buffer,
          contentType: r.contentType,
        });
        thumbnails.push({
          rank: r.rank,
          storagePath: uploaded.path,
          signedUrl: uploaded.signedUrl,
          prompt: r.prompt,
          seedIndex: r.seedIndex,
          scores: r.scores,
        });
        saveIndex += 1;
      }

      const projectId = await this.persistFromVideoProject({
        userId: params.userId,
        runId,
        analysis: analysisResult,
        thumbnails,
        videoUrl: params.videoUrl,
        sourceLabel: params.file ? 'upload' : 'url',
        style: params.style,
        prompt: params.prompt,
        templateId: params.template_id,
        avatarId: params.avatar_id,
        prioritizeFace: params.prioritize_face,
        videoMeta:
          params.videoUrl && !params.file
            ? (await this.youtubeMeta.getVideoMeta(params.videoUrl)).data ?? undefined
            : undefined,
      });

      return {
        runId,
        projectId,
        analysis: analysisResult,
        selectedShots: analysisResult.bestScenes,
        thumbnails,
      };
    } catch (e) {
      try {
        await this.billing.refundGenerationCredits(params.userId, creditCost, {
          referenceType: 'from_video_run',
          referenceId: runId,
        });
      } catch {
        /* best-effort; BillingService logs */
      }
      throw e;
    } finally {
      if (tempPath) {
        await this.storage.removeObjectsIfPresent(BUCKET_PROJECT_THUMBNAILS, [tempPath]);
      }
    }
  }

  private async persistFromVideoProject(params: {
    userId: string;
    runId: string;
    analysis: VideoAnalysis;
    thumbnails: FromVideoThumbnailOutput['thumbnails'];
    videoUrl?: string;
    sourceLabel: 'upload' | 'url';
    style?: string;
    prompt?: string;
    templateId?: string;
    avatarId?: string;
    prioritizeFace?: boolean;
    videoMeta?: Record<string, unknown>;
  }): Promise<string> {
    const client = this.supabase.getAdminClient();
    const rawTitle = params.analysis.summary.replace(/\s+/g, ' ').trim();
    const title = (rawTitle.length ? rawTitle : 'Video thumbnails').slice(0, 200);
    const firstPath = params.thumbnails[0]?.storagePath ?? null;

    const { data: project, error: pErr } = await client
      .from('projects')
      .insert({
        user_id: params.userId,
        title,
        platform: 'youtube',
        source_type: 'video',
        source_data: {
          from_video_run_id: params.runId,
          video_url: params.videoUrl ?? undefined,
          source: params.sourceLabel,
          style: params.style ?? undefined,
          prompt: params.prompt ?? undefined,
          video_meta: params.videoMeta ?? undefined,
          template_id: params.templateId ?? undefined,
          avatar_id: params.avatarId ?? undefined,
          prioritize_face: params.prioritizeFace ?? undefined,
          summary_excerpt: params.analysis.summary.slice(0, 500),
        },
        status: 'done',
        cover_thumbnail_storage_path: firstPath,
        cover_thumbnail_url: null,
      })
      .select('id')
      .single();

    if (pErr || !project?.id) {
      throw new Error(pErr?.message ?? 'Failed to create project from video');
    }

    const projectId = project.id as string;
    const templateIdCol = params.templateId?.trim() ?? null;

    for (const t of params.thumbnails) {
      const { error } = await client.from('thumbnail_variants').insert({
        project_id: projectId,
        status: 'done',
        template_id: templateIdCol,
        generated_image_storage_path: t.storagePath,
        generated_image_url: null,
        error_message: null,
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    return projectId;
  }
}
