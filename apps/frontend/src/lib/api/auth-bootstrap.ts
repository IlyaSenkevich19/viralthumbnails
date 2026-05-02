import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

export type AuthBootstrapDto = {
  id: string;
  email: string | null;
  trialStarted: boolean;
};

export function fetchAuthBootstrap(accessToken: string): Promise<AuthBootstrapDto> {
  return fetchJson<AuthBootstrapDto>(ApiRoutes.auth.me, accessToken);
}
