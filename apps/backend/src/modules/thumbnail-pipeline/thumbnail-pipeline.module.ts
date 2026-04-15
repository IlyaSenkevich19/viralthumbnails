import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ProjectThumbnailGenerationModule } from '../project-thumbnail-generation/project-thumbnail-generation.module';
import { StorageModule } from '../storage/storage.module';
import { VideoThumbnailsModule } from '../video-thumbnails/video-thumbnails.module';
import { ThumbnailPipelineEnabledGuard } from './thumbnail-pipeline-feature';
import { ThumbnailPipelineController } from './thumbnail-pipeline.controller';
import { PipelinePromptBuilderService } from './services/pipeline-prompt-builder.service';
import { PipelinePromptRefinementService } from './services/pipeline-prompt-refinement.service';
import { PipelineProjectPersistenceService } from './services/pipeline-project-persistence.service';
import { PipelineThumbnailEditingService } from './services/pipeline-thumbnail-editing.service';
import { PipelineThumbnailGenerationService } from './services/pipeline-thumbnail-generation.service';
import { PipelineVideoUnderstandingService } from './services/pipeline-video-understanding.service';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';

@Module({
  imports: [AuthModule, BillingModule, StorageModule, ProjectThumbnailGenerationModule, VideoThumbnailsModule],
  controllers: [ThumbnailPipelineController],
  providers: [
    ThumbnailPipelineEnabledGuard,
    PipelineVideoUnderstandingService,
    PipelinePromptRefinementService,
    PipelinePromptBuilderService,
    PipelineThumbnailGenerationService,
    PipelineThumbnailEditingService,
    PipelineProjectPersistenceService,
    ThumbnailPipelineOrchestratorService,
  ],
  exports: [
    ThumbnailPipelineOrchestratorService,
    PipelineProjectPersistenceService,
    PipelineVideoUnderstandingService,
    PipelinePromptBuilderService,
    PipelineThumbnailGenerationService,
    PipelineThumbnailEditingService,
  ],
})
export class ThumbnailPipelineModule {}
