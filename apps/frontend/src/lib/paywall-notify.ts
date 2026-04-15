import { toast } from 'sonner';
import { AppRoutes } from '@/config/routes';
import { isApiError } from '@/lib/api/api-error';
import { emitPaywallFunnelEvent } from '@/lib/paywall-funnel';

function creditsCtaToast(title: string, description?: string) {
  emitPaywallFunnelEvent('paywall_cta_shown', { title });
  toast.error(title, {
    description,
    action: {
      label: 'Credit packs',
      onClick: () => {
        emitPaywallFunnelEvent('paywall_cta_clicked', { title });
        window.location.href = AppRoutes.credits;
      },
    },
  });
}

/** Server rejected generation (403 INSUFFICIENT_CREDITS). */
export function toastInsufficientCreditsFromApi(message?: string) {
  creditsCtaToast(
    'Not enough credits',
    message && message.length > 0
      ? message
      : 'Buy a credit pack to keep generating. One-time packs — no subscription.',
  );
}

/**
 * Client-side guard before starting a paid action.
 * @returns false if blocked (toast shown).
 */
export function assertSufficientCredits(params: {
  balance: number | undefined;
  cost: number;
}): boolean {
  const { balance, cost } = params;
  if (cost <= 0) return true;
  if (balance === undefined) return true;
  if (balance < cost) {
    emitPaywallFunnelEvent('paywall_precheck_blocked', { need: cost, have: balance });
    creditsCtaToast(
      'Not enough credits',
      `This needs ${cost} credit${cost === 1 ? '' : 's'}. You have ${balance}.`,
    );
    return false;
  }
  return true;
}

export function handleBillingMutationError(err: unknown): boolean {
  if (isApiError(err) && err.code === 'INSUFFICIENT_CREDITS') {
    toastInsufficientCreditsFromApi(err.message);
    emitPaywallFunnelEvent('paywall_api_insufficient_credits');
    return true;
  }
  return false;
}

/** OpenRouter rejected the request (402) — separate from in-app Viral credits. */
export function handleOpenRouterMutationError(err: unknown): boolean {
  if (!isApiError(err) || err.statusCode !== 402) return false;
  if (err.code === 'OPENROUTER_BILLING_REQUIRED') {
    toast.error('OpenRouter: no API credits', {
      description:
        err.message ||
        'Add credits at openrouter.ai/settings/credits for the API key configured as OPENROUTER_API_KEY.',
    });
    return true;
  }
  if (err.code === 'OPENROUTER_VIDEO_BALANCE_REQUIRED') {
    toast.error('OpenRouter: video balance required', {
      description: err.message,
    });
    return true;
  }
  return false;
}
