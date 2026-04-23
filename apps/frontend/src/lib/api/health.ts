import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

export type SetupHealthResponse = {
  status: 'ok';
  checks: {
    supabaseUrl: boolean;
    supabaseServiceRoleKey: boolean;
    supabaseAnonKey: boolean;
    openRouterApiKey: boolean;
  };
  openRouter: {
    baseUrl: string;
    appTitle: string;
    projectGenTimeoutMs: number;
  };
  pipelineModels: {
    vlPrimary: string;
    vlFallback: string | null;
    textRefinement: string | null;
    imageGenerationDefault: string;
    imageGenerationPremium: string;
    imageEdit: string;
  };
  timestamp: string;
};

export async function getSetupHealth(token: string | null): Promise<SetupHealthResponse> {
  return fetchJson<SetupHealthResponse>(ApiRoutes.healthSetup, token);
}
