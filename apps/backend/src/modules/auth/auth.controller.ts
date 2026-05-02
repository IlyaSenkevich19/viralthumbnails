import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseGuard } from './guards/supabase.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller(ApiControllerPaths.auth)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async getMe(@CurrentUser() userId: string) {
    return this.authService.getBootstrap(userId);
  }
}
