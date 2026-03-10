import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './guards/supabase.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async getMe(@CurrentUser() userId: string) {
    return this.authService.getUser(userId);
  }
}
