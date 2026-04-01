import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_VIDEO_FROM } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { FromVideoBodyDto } from './dto/from-video-body.dto';
import { FromVideoThumbnailsService } from './from-video-thumbnails.service';
import type { UploadedVideoFile } from './types/upload.types';

const VIDEO_UPLOAD_LIMIT_BYTES = 80 * 1024 * 1024;

@ApiTags('thumbnails')
@ApiBearerAuth()
@Controller(ApiControllerPaths.thumbnails)
@UseGuards(SupabaseGuard)
export class VideoThumbnailsController {
  constructor(private readonly fromVideo: FromVideoThumbnailsService) {}

  @Post('from-video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        videoUrl: { type: 'string' },
        count: { type: 'integer', minimum: 1, maximum: 12 },
        style: { type: 'string' },
      },
    },
  })
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_VIDEO_FROM } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: VIDEO_UPLOAD_LIMIT_BYTES },
    }),
  )
  async fromVideoEndpoint(
    @CurrentUser() userId: string,
    @Body() body: FromVideoBodyDto,
    @UploadedFile() file?: UploadedVideoFile,
  ) {
    return this.fromVideo.run({
      userId,
      videoUrl: body.videoUrl,
      file,
      count: body.count,
      style: body.style,
    });
  }
}
