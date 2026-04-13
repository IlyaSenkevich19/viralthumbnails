export type LeadAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  page_path?: string;
  source?: string;
};

const STORAGE_KEY = 'vt_lead_attribution_v1';

function clean(value: string | null): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function collectLeadAttribution(): LeadAttribution {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);

  const fresh: LeadAttribution = {
    utm_source: clean(params.get('utm_source')),
    utm_medium: clean(params.get('utm_medium')),
    utm_campaign: clean(params.get('utm_campaign')),
    utm_content: clean(params.get('utm_content')),
    utm_term: clean(params.get('utm_term')),
    gclid: clean(params.get('gclid')),
    fbclid: clean(params.get('fbclid')),
    referrer: clean(document.referrer || null),
    page_path: clean(window.location.pathname),
    source: 'app_register',
  };

  const raw = window.localStorage.getItem(STORAGE_KEY);
  let saved: LeadAttribution = {};
  if (raw) {
    try {
      saved = JSON.parse(raw) as LeadAttribution;
    } catch {
      saved = {};
    }
  }

  const merged: LeadAttribution = {
    utm_source: fresh.utm_source ?? saved.utm_source,
    utm_medium: fresh.utm_medium ?? saved.utm_medium,
    utm_campaign: fresh.utm_campaign ?? saved.utm_campaign,
    utm_content: fresh.utm_content ?? saved.utm_content,
    utm_term: fresh.utm_term ?? saved.utm_term,
    gclid: fresh.gclid ?? saved.gclid,
    fbclid: fresh.fbclid ?? saved.fbclid,
    referrer: fresh.referrer ?? saved.referrer,
    page_path: fresh.page_path,
    source: fresh.source,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

