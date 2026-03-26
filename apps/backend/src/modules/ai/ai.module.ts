import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
