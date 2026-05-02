'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AppRoutes } from '@/config/routes';
import { pricingPlans } from '@/config/pricing-plans';
import { Button } from '@/components/ui/button';
import { CreditPacksGrid } from '@/components/billing/credit-packs-grid';
import { trackEvent } from '@/lib/analytics';
import { vtSpring } from '@/lib/motion-presets';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { InfoHint } from '@/components/ui/info-hint';
import {
  DEFAULT_NEW_PROJECT_VARIANT_COUNT,
  VARIANT_REFINE_CREDIT_COST,
} from '@/config/credits';
import {
  DEFAULT_FULL_PIPELINE_CREDIT_COST,
  DEFAULT_PIPELINE_WITH_IMAGE_EDIT_COST,
  MIN_PIPELINE_RUN_CREDIT_COST,
} from '@/lib/credit-costs';

export const OPEN_PAYWALL_EVENT = 'vt-open-insufficient-credits-paywall';

/** Paid packs only — starter row is contextual, not checkout */
const PAYWALL_PACK_PLANS = pricingPlans.filter((p) => p.id !== 'trial');

export type InsufficientCreditsPayload = {
  need?: number;
  have?: number;
  title?: string;
  description?: string;
};

type PaywallDismissReason =
  | 'overlay'
  | 'escape'
  | 'close_button'
  | 'continue_editing'
  | 'credits_page_nav';

function emitPaywallDismissed(reason: PaywallDismissReason, detail: InsufficientCreditsPayload): void {
  trackEvent('paywall_dismissed', {
    reason,
    title: detail.title ?? 'insufficient_credits',
    need: detail.need ?? null,
    have: detail.have ?? null,
  });
}

export function openInsufficientCreditsPaywall(payload: InsufficientCreditsPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<InsufficientCreditsPayload>(OPEN_PAYWALL_EVENT, { detail: payload }));
}

export function InsufficientCreditsPaywall() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<InsufficientCreditsPayload | null>(null);
  useFocusTrap(open && Boolean(payload), dialogRef);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const custom = e as CustomEvent<InsufficientCreditsPayload>;
      if (!custom.detail) return;
      setPayload(custom.detail);
      setOpen(true);
      trackEvent('paywall_viewed', {
        title: custom.detail.title ?? 'insufficient_credits',
        need: custom.detail.need,
        have: custom.detail.have,
      });
    };
    window.addEventListener(OPEN_PAYWALL_EVENT, onEvent as EventListener);
    return () => window.removeEventListener(OPEN_PAYWALL_EVENT, onEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!open || !payload) return;
    const frozenPayload = payload;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      emitPaywallDismissed('escape', frozenPayload);
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, payload]);

  if (!open || !payload) return null;

  const hasBalanceDetail =
    typeof payload.need === 'number' && typeof payload.have === 'number';
  const describedBy = [
    hasBalanceDetail ? 'credits-paywall-balance' : null,
    !hasBalanceDetail && payload.description ? 'credits-paywall-desc' : null,
    'credits-paywall-spend-hint',
  ]
    .filter(Boolean)
    .join(' ');
  const pipelineEditSurcharge = DEFAULT_PIPELINE_WITH_IMAGE_EDIT_COST - DEFAULT_FULL_PIPELINE_CREDIT_COST;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 px-3 py-6 backdrop-blur-md sm:px-5 sm:py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          emitPaywallDismissed('overlay', payload);
          setOpen(false);
        }
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-paywall-title"
        aria-describedby={describedBy}
        className="flex max-h-[min(92dvh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_40px_120px_-48px_rgba(0,0,0,0.95)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : vtSpring.enter}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border/60 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Credits</p>
              <h2 id="credits-paywall-title" className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {hasBalanceDetail ? 'Add credits to continue' : payload.title ?? 'Not enough credits'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {hasBalanceDetail ? (
                  <p
                    id="credits-paywall-balance"
                    className="min-w-0 max-w-[min(40rem,calc(100vw-5rem))] text-sm leading-relaxed text-muted-foreground"
                  >
                    This action needs <strong className="text-foreground">{payload.need}</strong> credit
                    {payload.need === 1 ? '' : 's'} · you have <strong className="text-foreground">{payload.have}</strong>.
                  </p>
                ) : payload.description ? (
                  <p id="credits-paywall-desc" className="min-w-0 max-w-[min(40rem,calc(100vw-5rem))] text-sm leading-relaxed text-muted-foreground">
                    {payload.description}
                  </p>
                ) : null}
                <InfoHint
                  className="shrink-0"
                  buttonLabel="Credit packs basics"
                  helpBody={<p>Add one-time bundles when you&apos;re ready—pricing reflects prepaid generation capacity, no subscription.</p>}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => {
                emitPaywallDismissed('close_button', payload);
                setOpen(false);
              }}
            >
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
          <div
            id="credits-paywall-spend-hint"
            className="mb-6 rounded-xl border border-border/55 bg-muted/20 px-4 py-3.5 sm:px-5 sm:py-4"
          >
            <p className="text-sm font-semibold text-foreground">How thumbnail runs debit credits</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/80">
              <li>
                <span className="text-foreground/95">Concepts-only runs</span> start at{' '}
                <strong className="text-foreground">{MIN_PIPELINE_RUN_CREDIT_COST}</strong> credit
                {MIN_PIPELINE_RUN_CREDIT_COST === 1 ? '' : 's'} (analysis without saving images).
              </li>
              <li>
                <span className="text-foreground/95">Default Generate batch</span> (
                {DEFAULT_NEW_PROJECT_VARIANT_COUNT} thumbnails with images) typically{' '}
                <strong className="text-foreground">{DEFAULT_FULL_PIPELINE_CREDIT_COST}</strong> credits.
              </li>
              <li>
                <span className="text-foreground/95">Built-in pipeline image edit</span> adds{' '}
                <strong className="text-foreground">{pipelineEditSurcharge}</strong> credit when enabled (same batch then
                totals <strong className="text-foreground">{DEFAULT_PIPELINE_WITH_IMAGE_EDIT_COST}</strong> credits).
              </li>
              <li>
                <span className="text-foreground/95">Refine on saved thumbnails</span> is usually{' '}
                <strong className="text-foreground">{VARIANT_REFINE_CREDIT_COST}</strong> credit each.
              </li>
              <li>Debit grows with variants per run—more thumbnails in one go costs more upfront.</li>
            </ul>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <h3 className="min-w-0 text-base font-semibold text-foreground">Credit packs</h3>
            <InfoHint
              className="shrink-0"
              buttonLabel="Choosing a credit pack"
              helpBody={
                <p>
                  Larger bundles lower the per-generation cost upfront. Unused credits persist on your ledger until consumed.
                </p>
              }
            />
          </div>
          <CreditPacksGrid plans={PAYWALL_PACK_PLANS} className="lg:grid-cols-3" />
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                emitPaywallDismissed('continue_editing', payload);
                setOpen(false);
              }}
            >
              Continue editing
            </Button>
            <button
              type="button"
              className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline sm:text-right"
              onClick={() => {
                trackEvent('paywall_cta_clicked', {
                  cta: 'credits_page_full',
                  need: payload.need,
                  have: payload.have,
                });
                emitPaywallDismissed('credits_page_nav', payload);
                setOpen(false);
                router.push(AppRoutes.credits);
              }}
            >
              Credits page — balance &amp; history
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
