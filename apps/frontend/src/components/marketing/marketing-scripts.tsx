'use client';

import { Suspense } from 'react';
import { GoogleTagManager } from '@next/third-parties/google';

import { AnalyticsListeners } from './analytics-listeners';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

/**
 * Single analytics surface for the App Router layout: GTM container + SPA/dataLayer bridges.
 * `Suspense` wraps listeners because `useSearchParams` participates in CSR bailout during prerender.
 * Configure GA4, Google Ads, and cross-domain linker inside the GTM container.
 */
export function MarketingScripts() {
  return (
    <>
      {GTM_ID ? (
        <>
          <GoogleTagManager gtmId={GTM_ID} />
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height={0}
              width={0}
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      ) : null}
      <Suspense fallback={null}>
        <AnalyticsListeners />
      </Suspense>
    </>
  );
}
