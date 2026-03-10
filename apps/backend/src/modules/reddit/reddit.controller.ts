import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RedditService } from './reddit.service';

@ApiTags('reddit')
@Controller('reddit')
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  @Post('scan-now')
  async scanNow() {
    return this.redditService.scanAllCampaigns();
  }
}
