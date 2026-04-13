import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { ProjectThumbnailGenerationModule } from '../project-thumbnail-generation/project-thumbnail-generation.module';
import { StorageModule } from '../storage/storage.module';
import { FromVideoThumbnailsService } from './from-video-thumbnails.service';
import { VideoThumbnailsController } from './video-thumbnails.controller';
import { VideoIngestionService } from './services/video-ingestion.service';
import { VideoAnalysisService } from './services/video-analysis.service';
import { ThumbnailGenerationService } from './services/thumbnail-generation.service';
import { ThumbnailRankingService } from './services/thumbnail-ranking.service';
import { YoutubeVideoMetaService } from './services/youtube-video-meta.service';

@Module({
  imports: [AuthModule, BillingModule, StorageModule, OpenRouterModule, ProjectThumbnailGenerationModule],
  controllers: [VideoThumbnailsController],
  providers: [
    VideoIngestionService,
    VideoAnalysisService,
    ThumbnailGenerationService,
    ThumbnailRankingService,
    YoutubeVideoMetaService,
    FromVideoThumbnailsService,
  ],
  exports: [FromVideoThumbnailsService],
})
export class VideoThumbnailsModule {}
