import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  @Get('status')
  status() {
    return {
      status: 'ok',
      service: 'reddit-leadgen-scanner',
      message: 'Use POST /reddit/scan-now to trigger scan',
    };
  }
}
