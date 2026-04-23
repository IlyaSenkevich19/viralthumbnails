import { Controller, Get } from '@nestjs/common';
import { ApiControllerPaths } from '../../common/constants/api-controller-paths';
import { ApiTags } from '@nestjs/swagger';
import { getPipelineSetupModelSnapshot } from '../../config/openrouter-models';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller(ApiControllerPaths.health)
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('setup')
  setup() {
    const or = getOpenRouterConfig(this.config);
    return {
      status: 'ok' as const,
      checks: {
        supabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
        supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
        supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY?.trim()),
        openRouterApiKey: Boolean(or.apiKey),
      },
      openRouter: {
        baseUrl: or.baseUrl,
        appTitle: or.appTitle,
        projectGenTimeoutMs: or.projectGenTimeoutMs,
      },
      pipelineModels: getPipelineSetupModelSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }
}
