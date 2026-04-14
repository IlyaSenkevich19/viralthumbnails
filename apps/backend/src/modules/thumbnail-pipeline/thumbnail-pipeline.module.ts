import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ThumbnailPipelineController } from './thumbnail-pipeline.controller';
import { PipelinePromptBuilderService } from './services/pipeline-prompt-builder.service';
import { PipelinePromptRefinementService } from './services/pipeline-prompt-refinement.service';
import { PipelineThumbnailEditingService } from './services/pipeline-thumbnail-editing.service';
import { PipelineThumbnailGenerationService } from './services/pipeline-thumbnail-generation.service';
import { PipelineVideoUnderstandingService } from './services/pipeline-video-understanding.service';
import { ThumbnailPipelineOrchestratorService } from './services/thumbnail-pipeline-orchestrator.service';

@Module({
  imports: [AuthModule],
  controllers: [ThumbnailPipelineController],
  providers: [
    PipelineVideoUnderstandingService,
    PipelinePromptRefinementService,
    PipelinePromptBuilderService,
    PipelineThumbnailGenerationService,
    PipelineThumbnailEditingService,
    ThumbnailPipelineOrchestratorService,
  ],
  exports: [
    ThumbnailPipelineOrchestratorService,
    PipelineVideoUnderstandingService,
    PipelinePromptBuilderService,
    PipelineThumbnailGenerationService,
    PipelineThumbnailEditingService,
  ],
})
export class ThumbnailPipelineModule {}
