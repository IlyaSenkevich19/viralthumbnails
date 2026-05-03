import { forwardRef, Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { LeadCrmModule } from '../lead-crm/lead-crm.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './guards/supabase.guard';

@Module({
  imports: [LeadCrmModule, forwardRef(() => BillingModule)],
  controllers: [AuthController],
  providers: [AuthService, SupabaseGuard],
  exports: [AuthService, SupabaseGuard],
})
export class AuthModule {}
