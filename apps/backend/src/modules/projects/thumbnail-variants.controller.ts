import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { THROTTLE_PROJECT_GENERATE } from '../../common/throttle/throttle-limits';
import { UserIdThrottlerGuard } from '../../common/throttle/user-id-throttler.guard';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { GenerateThumbnailsDto } from './dto/generate-thumbnails.dto';

@ApiTags('thumbnail-variants')
@ApiBearerAuth()
@Controller(ApiControllerPaths.projects)
@UseGuards(SupabaseGuard)
export class ThumbnailVariantsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post(':id/generate')
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { ...THROTTLE_PROJECT_GENERATE } })
  generate(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateThumbnailsDto,
  ) {
    const count = dto.count ?? 1;
    return this.projects.generateVariants(id, userId, dto.template_id, count, dto.avatar_id, dto.prioritize_face, {
      faceInThumbnail: dto.face_in_thumbnail,
    });
  }

  @Get(':id/variants')
  list(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.listVariants(id, userId);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVariant(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.projects.deleteVariant(id, variantId, userId);
  }
}
