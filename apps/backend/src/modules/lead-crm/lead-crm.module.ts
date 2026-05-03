import { Module } from '@nestjs/common';
import { LeadCrmWebhookService } from './lead-crm-webhook.service';
import { LeadsController } from './leads.controller';

@Module({
  controllers: [LeadsController],
  providers: [LeadCrmWebhookService],
  exports: [LeadCrmWebhookService],
})
export class LeadCrmModule {}
