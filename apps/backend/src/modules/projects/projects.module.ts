import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ThumbnailVariantsController } from './thumbnail-variants.controller';
import { ProjectsService } from './projects.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [SupabaseModule, AiModule],
  controllers: [ProjectsController, ThumbnailVariantsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
