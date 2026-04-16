import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UserIdThrottlerGuard } from './common/throttle/user-id-throttler.guard';
import { ConfigModule } from '@nestjs/config';
import { openRouterConfig } from './config/openrouter.config';
import { videoPipelineConfig } from './config/video-pipeline.config';

import { SupabaseModule } from './modules/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AvatarsModule } from './modules/avatars/avatars.module';
import { BillingModule } from './modules/billing/billing.module';
import { OpenRouterModule } from './modules/openrouter/openrouter.module';
import { VideoThumbnailsModule } from './modules/video-thumbnails/video-thumbnails.module';
import { ThumbnailPipelineModule } from './modules/thumbnail-pipeline/thumbnail-pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [openRouterConfig, videoPipelineConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    SupabaseModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    TemplatesModule,
    AvatarsModule,
    BillingModule,
    OpenRouterModule,
    VideoThumbnailsModule,
    ThumbnailPipelineModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    UserIdThrottlerGuard,
  ],
})
export class AppModule {}
