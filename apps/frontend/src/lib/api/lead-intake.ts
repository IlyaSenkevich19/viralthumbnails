import type { LeadAttribution } from '@/lib/lead-attribution';

export type LeadIntakePayload = LeadAttribution & {
  lead_session_id: string;
  email?: string;
  biggest_thumbnail_problem?: string;
  subscriber_count?: string;
  videos_per_week?: string;
  channel_url: string;
  /** e.g. register_wizard_step_4 */
  funnel_stage: string;
};

export type LeadIntakeResult = { ok: true; skipped?: boolean } | { ok: false; message: string };

export async function submitLeadIntake(payload: LeadIntakePayload): Promise<LeadIntakeResult> {
  const res = await fetch('/api/lead-intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: { ok?: boolean; skipped?: boolean; error?: string } = {};
  if (res.headers.get('content-type')?.includes('application/json')) {
    data = (await res.json().catch(() => ({}))) as typeof data;
  }
  if (!res.ok) {
    return { ok: false, message: data.error ?? `Request failed (${res.status})` };
  }
  return { ok: true, skipped: data.skipped };
}
