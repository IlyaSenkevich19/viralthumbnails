import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { VideoThumbnailsController } from './video-thumbnails.controller';
import { VideoIngestionService } from './services/video-ingestion.service';
import { YoutubeVideoMetaService } from './services/youtube-video-meta.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [VideoThumbnailsController],
  providers: [VideoIngestionService, YoutubeVideoMetaService],
  exports: [VideoIngestionService, YoutubeVideoMetaService],
})
export class VideoThumbnailsModule {}
