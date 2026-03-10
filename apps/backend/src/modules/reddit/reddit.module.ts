import { Module } from '@nestjs/common';
import { RedditService } from './reddit.service';
import { RedditController } from './reddit.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [RedditController],
  providers: [RedditService],
  exports: [RedditService],
})
export class RedditModule {}
