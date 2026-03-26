import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [SupabaseModule, StorageModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
