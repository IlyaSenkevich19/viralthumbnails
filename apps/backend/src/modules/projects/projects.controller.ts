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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller(ApiControllerPaths.projects)
@UseGuards(SupabaseGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(userId, dto);
  }

  @Get()
  list(@CurrentUser() userId: string) {
    return this.projects.listForUser(userId);
  }

  @Get(':id')
  getOne(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.getWithVariants(id, userId);
  }

  @Put(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.deleteProject(id, userId);
  }
}
