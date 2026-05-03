import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ManualCreditController } from './manual-credit.controller';
import { ManualCreditService } from './manual-credit.service';

@Module({
  imports: [forwardRef(() => AuthModule), SupabaseModule],
  controllers: [BillingController, ManualCreditController],
  providers: [BillingService, ManualCreditService],
  exports: [BillingService, ManualCreditService],
})
export class BillingModule {}
