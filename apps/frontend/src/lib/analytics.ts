'use client';

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function cleanParams(params?: AnalyticsEventParams): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function trackEvent(name: string, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: name,
    ...cleanParams(params),
  });
}

export function trackPageView(pathname: string, search?: string) {
  if (typeof window === 'undefined') return;
  const pagePath = `${pathname}${search ? `?${search}` : ''}`;
  trackEvent('page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title || undefined,
  });
}
