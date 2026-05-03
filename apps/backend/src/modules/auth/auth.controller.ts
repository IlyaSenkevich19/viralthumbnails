import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CompleteLeadQualificationDto } from './dto/complete-lead-qualification.dto';
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

  @Post('lead-qualification')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  async postLeadQualification(
    @CurrentUser() userId: string,
    @Body() body: CompleteLeadQualificationDto,
    @Headers('host') host?: string,
  ) {
    return this.authService.completeLeadQualification(userId, body, host);
  }
}
