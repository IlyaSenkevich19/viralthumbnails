/**
 * Lightweight funnel hooks for GTM / analytics: listen on `window` for `vt:funnel`.
 * Detail: `{ name: string, ... }`.
 */
export function emitPaywallFunnelEvent(name: string, detail?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('vt:funnel', { detail: { name, ...detail } }));
}
