import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { GetVideoMetaDto } from './dto/get-video-meta.dto';
import { ParseVideoUrlQueryDto } from './dto/parse-video-url-query.dto';
import { YoutubeVideoMetaService } from './services/youtube-video-meta.service';

@ApiTags('thumbnails')
@ApiBearerAuth()
@Controller(ApiControllerPaths.thumbnails)
@UseGuards(SupabaseGuard)
export class VideoThumbnailsController {
  constructor(private readonly youtubeMeta: YoutubeVideoMetaService) {}

  @Get('parse-url')
  parseVideoUrl(@Query() query: ParseVideoUrlQueryDto) {
    return this.youtubeMeta.parseUrl(query.url);
  }

  @Post('get-video-meta')
  getVideoMeta(@Body() body: GetVideoMetaDto) {
    return this.youtubeMeta.getVideoMeta(body.video_url);
  }

}
