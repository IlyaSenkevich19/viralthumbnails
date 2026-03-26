import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
