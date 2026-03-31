import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

export type GenerationCreditsDto = {
  balance: number;
  quota: number;
};

export async function getGenerationCredits(token: string | null): Promise<GenerationCreditsDto> {
  return fetchJson<GenerationCreditsDto>(ApiRoutes.billing.credits, token);
}
