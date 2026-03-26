import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(SupabaseGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.templates.listForUser(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateTemplateDto) {
    return this.templates.create(userId, dto);
  }
}
