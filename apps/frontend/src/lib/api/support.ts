import { ApiRoutes, browserApiPath } from '@/config/api-routes';

export type SupportContactSource = 'landing' | 'app';

export type SupportContactPayload = {
  email: string;
  message: string;
  name?: string;
  source: SupportContactSource;
  page_url?: string;
  /** Honeypot — leave empty */
  company?: string;
};

export async function submitSupportContact(payload: SupportContactPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(browserApiPath(ApiRoutes.support.contact), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      message: payload.message,
      name: payload.name,
      source: payload.source,
      page_url: payload.page_url ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
      company: payload.company ?? '',
    }),
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'Invalid response' };
  }

  if (res.ok && body && typeof body === 'object' && 'ok' in body && (body as { ok: boolean }).ok) {
    return { ok: true };
  }

  const msg =
    body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
      ? (body as { message: string }).message
      : res.statusText || 'Request failed';
  return { ok: false, error: msg };
}
