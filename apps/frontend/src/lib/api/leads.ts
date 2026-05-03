import { ApiRoutes } from '@/config/api-routes';
import { fetchJson } from './fetch-json';

/** Anonymous lead intake → Nest → Google Apps Script (same contract as in-app qualification). */
export async function submitPublicLeadIntake(body: Record<string, unknown>): Promise<{
  ok: boolean;
  skipped?: boolean;
  skippedReason?: string;
}> {
  return fetchJson(ApiRoutes.leads.intake, null, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
