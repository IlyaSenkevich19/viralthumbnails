import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { VideoThumbnailsController } from './video-thumbnails.controller';
import { VideoIngestionService } from './services/video-ingestion.service';
import { VideoPipelineDurationGateService } from './services/video-pipeline-duration-gate.service';
import { VideoFrameSampleService } from './services/video-frame-sample.service';
import { YoutubeVideoMetaService } from './services/youtube-video-meta.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [VideoThumbnailsController],
  providers: [
    VideoIngestionService,
    YoutubeVideoMetaService,
    VideoPipelineDurationGateService,
    VideoFrameSampleService,
  ],
  exports: [
    VideoIngestionService,
    YoutubeVideoMetaService,
    VideoPipelineDurationGateService,
    VideoFrameSampleService,
  ],
})
export class VideoThumbnailsModule {}
