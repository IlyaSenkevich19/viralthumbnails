'use client';

import { GoogleTagManager } from '@next/third-parties/google';
import Script from 'next/script';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const GA4_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();

/** GA4 cross-domain / linker: apex + www + app subdomain */
const LINKER = JSON.stringify({
  domains: ['viralthumblify.com', 'www.viralthumblify.com', 'app.viralthumblify.com'],
});

/**
 * One path to avoid double counting:
 * - If `NEXT_PUBLIC_GTM_ID` is set → GTM only. Configure GA4 + Google Ads inside GTM (recommended).
 * - Else → gtag.js with GA4 and/or Google Ads + linker for viralthumblify.com + app.
 */
export function MarketingScripts() {
  if (GTM_ID) {
    return (
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
    );
  }

  if (!GA4_ID && !ADS_ID) return null;

  const scriptQueryId = GA4_ID ?? ADS_ID!;
  const configs: string[] = [];
  if (GA4_ID) {
    configs.push(`gtag('config', '${GA4_ID}', { linker: ${LINKER} });`);
  }
  if (ADS_ID) {
    configs.push(`gtag('config', '${ADS_ID}', { linker: ${LINKER} });`);
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${scriptQueryId}`}
        strategy="afterInteractive"
      />
      <Script id="google-gtag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configs.join('\n')}`}
      </Script>
    </>
  );
}
