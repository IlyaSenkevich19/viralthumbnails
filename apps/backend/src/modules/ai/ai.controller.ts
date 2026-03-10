import {
  Controller,
  Post,
  Body,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly supabase: SupabaseService,
  ) {}

  @Post('score')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async scorePost(
    @Body('title') title: string,
    @Body('content') content = '',
  ) {
    const score = await this.aiService.scoreIntent(title ?? '', content ?? '');
    return { score };
  }

  @Post('score-post')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async scorePostLegacy(
    @Body('title') title: string,
    @Body('content') content = '',
  ) {
    const score = await this.aiService.scoreIntent(title ?? '', content ?? '');
    return { score };
  }

  @Post('score-lead')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async scoreLead(
    @CurrentUser() userId: string,
    @Body('leadId', ParseIntPipe) leadId: number,
  ) {
    const lead = await this.supabase.getLeadById(leadId);
    const campaign = await this.supabase.getCampaignById(lead.campaign_id);
    if (campaign.user_id !== userId) {
      throw new ForbiddenException('Lead not found');
    }
    const score = await this.aiService.scoreIntent(
      lead.title ?? '',
      lead.content ?? '',
    );
    await this.supabase.updateLeadScore(leadId, score);
    return { leadId, score };
  }

  @Post('reply')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async generateReply(
    @Body() body: { title: string; content?: string; productDescription?: string },
  ) {
    const reply = await this.aiService.generateReply(
      { title: body.title ?? '', content: body.content ?? '' },
      body.productDescription ?? 'our product/service',
    );
    return { reply };
  }

  @Post('generate-reply')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async generateReplyLegacy(
    @Body('title') title: string,
    @Body('content') content = '',
  ) {
    const reply = await this.aiService.generateReply(
      { title: title ?? '', content: content ?? '' },
      'our product/service',
    );
    return { reply };
  }

  @Post('generate-reply-lead')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async generateReplyForLead(
    @CurrentUser() userId: string,
    @Body('leadId', ParseIntPipe) leadId: number,
    @Body('productDescription') productDescription?: string,
  ) {
    const lead = await this.supabase.getLeadById(leadId);
    const campaign = await this.supabase.getCampaignById(lead.campaign_id);
    if (campaign.user_id !== userId) {
      throw new ForbiddenException('Lead not found');
    }
    const reply = await this.aiService.generateReply(
      { title: lead.title ?? '', content: lead.content ?? '' },
      productDescription ?? 'our product/service',
    );
    return { reply };
  }
}
