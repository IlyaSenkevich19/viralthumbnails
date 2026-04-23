'use client';

import Link from 'next/link';
import { Check, ChevronDown } from 'lucide-react';
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
        <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border/60 pb-4">
          <h3 className="text-base font-semibold text-foreground">Your balance</h3>
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="sr-only">Current credits: </span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {credits?.balance ?? '—'}
            </span>{' '}
            <span className="text-xs font-medium uppercase tracking-wide">credits</span>
          </p>
        </div>

        <details className="group relative [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left motion-base rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mx-1 px-1 hover:bg-muted/25">
            <span>
              <span className="text-sm font-medium text-foreground">Credits history</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Tap to show or hide recent balance changes
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="overflow-x-auto pb-1 pt-1">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2.5 pr-3 font-medium">Date</th>
                  <th className="py-2.5 pr-3 font-medium">Reason</th>
                  <th className="py-2.5 pr-3 font-medium">Reference</th>
                  <th className="py-2.5 pr-2 text-right font-medium">Delta</th>
                  <th className="py-2.5 pl-2 text-right font-medium">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {ledgerPending ? (
                  <tr>
                    <td className="py-8 text-center text-muted-foreground" colSpan={5}>
                      Loading history…
                    </td>
                  </tr>
                ) : !ledger || ledger.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-muted-foreground" colSpan={5}>
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
                      <tr key={item.id} className="transition-colors hover:bg-muted/20">
                        <td className="py-3 pr-3 text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground/90">
                            {reasonLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">{reference}</td>
                        <td
                          className={cn(
                            'py-3 pr-2 text-right font-semibold tabular-nums',
                            isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground',
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {item.delta}
                        </td>
                        <td className="py-3 pl-2 text-right tabular-nums text-foreground">{item.balance_after}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Need a custom pack size? Contact support and we&apos;ll set it up manually.{' '}
        <Link href={AppRoutes.create} className="text-primary underline-offset-4 hover:underline">
          Back to create
        </Link>
      </p>
    </div>
  );
}
