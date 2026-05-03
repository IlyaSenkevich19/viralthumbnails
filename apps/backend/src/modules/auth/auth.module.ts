import { Module } from '@nestjs/common';
import { LeadCrmModule } from '../lead-crm/lead-crm.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './guards/supabase.guard';

@Module({
  imports: [LeadCrmModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseGuard],
  exports: [AuthService, SupabaseGuard],
})
export class AuthModule {}
