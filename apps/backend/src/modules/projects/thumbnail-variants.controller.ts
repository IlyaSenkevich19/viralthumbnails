import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { GenerateThumbnailsDto } from './dto/generate-thumbnails.dto';

@ApiTags('thumbnail-variants')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(SupabaseGuard)
export class ThumbnailVariantsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post(':id/generate')
  generate(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateThumbnailsDto,
  ) {
    const count = dto.count ?? 1;
    return this.projects.generateVariants(id, userId, dto.template_id, count);
  }

  @Get(':id/variants')
  list(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.listVariants(id, userId);
  }
}
