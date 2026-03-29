import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(SupabaseGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('credits')
  credits(@CurrentUser() userId: string) {
    return this.billing.getGenerationCredits(userId);
  }
}
