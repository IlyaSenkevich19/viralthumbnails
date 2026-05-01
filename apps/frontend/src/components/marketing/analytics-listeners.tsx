'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent, trackPageView } from '@/lib/analytics';

type FunnelEventDetail = {
  name?: string;
  [key: string]: unknown;
};

function toAnalyticsParams(detail: FunnelEventDetail): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (key === 'name' || value === undefined) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

export function AnalyticsListeners() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, search);
  }, [pathname, search]);

  useEffect(() => {
    const onFunnel = (event: Event) => {
      const detail = (event as CustomEvent<FunnelEventDetail>).detail;
      if (!detail?.name) return;
      trackEvent(detail.name, toAnalyticsParams(detail));
    };
    window.addEventListener('vt:funnel', onFunnel as EventListener);
    return () => window.removeEventListener('vt:funnel', onFunnel as EventListener);
  }, []);

  return null;
}
