import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { TEMPLATE_NICHES } from './constants/template-niches';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(SupabaseGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get('niches')
  listNiches() {
    return TEMPLATE_NICHES;
  }

  @Get()
  list(@CurrentUser() userId: string, @Query() query: ListTemplatesQueryDto) {
    return this.templates.listForUser(userId, query.niche);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateTemplateDto) {
    return this.templates.create(userId, dto);
  }
}
