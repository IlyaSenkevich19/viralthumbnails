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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { SupabaseGuard } from '../auth/guards/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AvatarsService } from './avatars.service';
import { CreateAvatarDto } from './dto/create-avatar.dto';

@ApiTags('avatars')
@ApiBearerAuth()
@Controller(ApiControllerPaths.avatars)
@UseGuards(SupabaseGuard)
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.avatars.listForUser(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateAvatarDto) {
    return this.avatars.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.avatars.deleteForUser(id, userId);
  }
}
