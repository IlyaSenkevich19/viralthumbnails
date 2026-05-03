import { ApiRoutes } from '@/config/api-routes';
import type { LeadAttribution } from '@/lib/lead-attribution';
import { fetchJson } from './fetch-json';

export type AuthBootstrapDto = {
  id: string;
  email: string | null;
  trialStarted: boolean;
  /** Present on API ≥ lead-qual migration; absent older backends default to `true` in {@link fetchAuthBootstrap} consumers. */
  leadQualificationCompleted?: boolean;
  /** Credits applied from `pending_manual_credits` on this `/auth/me` call (mediator MVP). */
  pendingCreditsClaimed?: number;
};

export type CompleteLeadQualificationPayload = LeadAttribution & {
  lead_session_id: string;
  channel_url: string;
  biggest_thumbnail_problem?: string;
  subscriber_count?: string;
  videos_per_week?: string;
  page_path?: string;
  source?: string;
  company?: string;
};

export function fetchAuthBootstrap(accessToken: string): Promise<AuthBootstrapDto> {
  return fetchJson<AuthBootstrapDto>(ApiRoutes.auth.me, accessToken);
}

export function completeLeadQualification(
  accessToken: string,
  body: CompleteLeadQualificationPayload,
): Promise<{ ok: true; crmSkipped?: boolean }> {
  return fetchJson<{ ok: true; crmSkipped?: boolean }>(ApiRoutes.auth.leadQualification, accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
