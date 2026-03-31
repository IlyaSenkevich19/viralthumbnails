import { Controller, Get } from '@nestjs/common';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller(ApiControllerPaths.health)
export class HealthController {
  @Get()
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
