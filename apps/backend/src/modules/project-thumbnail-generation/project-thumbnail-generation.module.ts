import { Module } from '@nestjs/common';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';
import { ProjectVariantImageService } from './project-variant-image.service';

/**
 * Project-scoped thumbnail variant image generation (`thumbnail_variants` rows).
 * Depends on globally registered {@link OpenRouterModule} for {@link OpenRouterClient}
 * (still listed in `imports` so the dependency is visible in the module graph).
 */
@Module({
  imports: [SupabaseModule, StorageModule, OpenRouterModule],
  providers: [ProjectVariantImageService],
  exports: [ProjectVariantImageService],
})
export class ProjectThumbnailGenerationModule {}
