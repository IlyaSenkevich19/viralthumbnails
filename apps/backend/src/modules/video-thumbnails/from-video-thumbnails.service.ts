import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BillingService } from '../billing/billing.service';
import { BUCKET_PROJECT_THUMBNAILS, StorageService } from '../storage/storage.service';
import type { UploadedVideoFile } from './types/upload.types';
import { VideoIngestionService } from './services/video-ingestion.service';
import { VideoAnalysisService } from './services/video-analysis.service';
import { ThumbnailGenerationService } from './services/thumbnail-generation.service';
import { ThumbnailRankingService } from './services/thumbnail-ranking.service';
import type { VideoAnalysis } from './schemas/video-analysis.schema';
import type { RankedThumbnail } from './services/thumbnail-ranking.service';

export type FromVideoThumbnailOutput = {
  runId: string;
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
    private readonly storage: StorageService,
    private readonly billing: BillingService,
  ) {}

  async run(params: {
    userId: string;
    videoUrl?: string;
    file?: UploadedVideoFile;
    count?: number;
    style?: string;
  }): Promise<FromVideoThumbnailOutput> {
    const runId = randomUUID();
    const count = Math.min(12, Math.max(1, params.count ?? 4));
    const creditCost = this.billing.videoPipelineCreditCost(count);
    await this.billing.reserveGenerationCredits(params.userId, creditCost);

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

      const analysisResult = await this.analysis.analyze(source.url, params.style);

      const candidates = await this.generation.generateCandidates({
        analysis: analysisResult,
        count,
        style: params.style,
      });

      if (candidates.length === 0) {
        throw new Error('No thumbnails were generated (check OPENROUTER_IMAGE_MODEL and response format)');
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

      return {
        runId,
        analysis: analysisResult,
        selectedShots: analysisResult.bestScenes,
        thumbnails,
      };
    } catch (e) {
      try {
        await this.billing.refundGenerationCredits(params.userId, creditCost);
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
}
