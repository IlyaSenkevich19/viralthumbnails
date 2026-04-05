import { Module } from '@nestjs/common';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';
import { TemplatesModule } from '../templates/templates.module';
import { ProjectVariantImageService } from './project-variant-image.service';

@Module({
  imports: [SupabaseModule, StorageModule, OpenRouterModule, TemplatesModule],
  providers: [ProjectVariantImageService],
  exports: [ProjectVariantImageService],
})
export class ProjectThumbnailGenerationModule {}
