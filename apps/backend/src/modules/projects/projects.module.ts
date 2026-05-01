import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ThumbnailVariantsController } from './thumbnail-variants.controller';
import { ProjectsService } from './projects.service';
import { ProjectGenerationService } from './project-generation.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProjectThumbnailGenerationModule } from '../project-thumbnail-generation/project-thumbnail-generation.module';
import { BillingModule } from '../billing/billing.module';
import { StorageModule } from '../storage/storage.module';
import { ThumbnailPipelineModule } from '../thumbnail-pipeline/thumbnail-pipeline.module';
import { VideoThumbnailsModule } from '../video-thumbnails/video-thumbnails.module';

@Module({
  imports: [
    AuthModule,
    SupabaseModule,
    StorageModule,
    ProjectThumbnailGenerationModule,
    BillingModule,
    ThumbnailPipelineModule,
    VideoThumbnailsModule,
  ],
  controllers: [ThumbnailVariantsController, ProjectsController],
  providers: [ProjectsService, ProjectGenerationService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
