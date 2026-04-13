import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

export type GenerationCreditsDto = {
  balance: number;
  totalGranted: number;
};

export async function getGenerationCredits(token: string | null): Promise<GenerationCreditsDto> {
  return fetchJson<GenerationCreditsDto>(ApiRoutes.billing.credits, token);
}

export type CreditLedgerEntryDto = {
  id: string;
  delta: number;
  balance_after: number;
  reason: 'trial_grant' | 'purchase' | 'reserve' | 'refund' | 'manual_adjustment';
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getCreditLedger(token: string | null): Promise<CreditLedgerEntryDto[]> {
  return fetchJson<CreditLedgerEntryDto[]>(ApiRoutes.billing.creditsLedger, token);
}
