const STORAGE_KEY = 'vt_lead_session_id_v1';

/** Stable id per browser tab session for CRM upsert (Apps Script matches on `lead_session_id`). */
export function getOrCreateLeadSessionId(): string {
  if (typeof window === 'undefined') {
    return `ssr_${Date.now()}`;
  }
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY)?.trim();
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `lead_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    window.sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}
