'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import { pricingPlans } from '@/config/pricing-plans';
import { Button } from '@/components/ui/button';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { useCreditLedger, useGenerationCredits } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const REASON_LABEL: Record<string, string> = {
  trial_grant: 'Trial grant',
  purchase: 'Purchase',
  reserve: 'Generation reserve',
  refund: 'Refund',
  manual_adjustment: 'Manual adjustment',
};

export default function CreditsPricingPage() {
  const { data: credits } = useGenerationCredits();
  const { data: ledger, isPending: ledgerPending } = useCreditLedger();

  return (
    <div className="space-y-10 pb-8">
      <SetPageFrame title="Credit packs" />

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-foreground">
        <strong className="font-semibold">Checkout not enabled yet.</strong>{' '}
        <span className="text-muted-foreground">
          Payments will open as one-time credit packs. For now you can keep using trial credits.
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'surface relative flex flex-col rounded-2xl p-6',
              plan.featured &&
                'border-primary/60 shadow-[0_0_0_1px_rgba(255,59,59,0.35),0_20px_50px_-24px_rgba(255,59,59,0.25)] lg:scale-[1.02] lg:py-7',
            )}
          >
            {plan.badge ? (
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-md">
                {plan.badge}
              </span>
            ) : null}

            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {plan.credits} credits
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            </div>

            <ul className="mb-6 flex flex-1 flex-col gap-2.5 text-sm text-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              className="mt-auto w-full rounded-xl shadow-none"
              variant={
                plan.ctaStyle === 'outline'
                  ? 'outline'
                  : plan.ctaStyle === 'gold'
                    ? 'secondary'
                    : 'default'
              }
              disabled
              title="Payments are not connected yet"
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>

      <section className="surface-dashboard relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="relative">
            <h3 className="text-base font-semibold text-foreground">Credits history</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Last operations on your credit balance.
            </p>
          </div>
          <div className="relative rounded-xl border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-sm">
            Balance:{' '}
            <span className="font-semibold tabular-nums text-foreground">{credits?.balance ?? '—'}</span>
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-xl border border-white/10 bg-black/15">
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.03] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Reason</th>
                <th className="px-4 py-2.5 text-left font-medium">Reference</th>
                <th className="px-4 py-2.5 text-right font-medium">Delta</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {ledgerPending ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground/90" colSpan={5}>
                    Loading history...
                  </td>
                </tr>
              ) : !ledger || ledger.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground/90" colSpan={5}>
                    No credit operations yet.
                  </td>
                </tr>
              ) : (
                ledger.map((item) => {
                  const isPositive = item.delta > 0;
                  const reasonLabel = REASON_LABEL[item.reason] ?? item.reason;
                  const reference = item.reference_type
                    ? `${item.reference_type}${item.reference_id ? `:${item.reference_id}` : ''}`
                    : '—';
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-white/10 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-foreground/90">
                          {reasonLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{reference}</td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-semibold tabular-nums',
                          isPositive ? 'text-emerald-300' : 'text-foreground',
                        )}
                      >
                        {isPositive ? '+' : ''}
                        {item.delta}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground/95">
                        {item.balance_after}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Need a custom pack size? Contact support and we&apos;ll set it up manually.{' '}
        <Link href={AppRoutes.dashboard} className="text-primary underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
