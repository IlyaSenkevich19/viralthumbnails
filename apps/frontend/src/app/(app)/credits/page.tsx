'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import { pricingPlans } from '@/config/pricing-plans';
import { CreditPacksGrid } from '@/components/billing/credit-packs-grid';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { EmptyState } from '@/components/ui/empty-state';
import { InfoHint } from '@/components/ui/info-hint';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { SectionHeading } from '@/components/ui/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditLedger, useGenerationCredits } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { History } from 'lucide-react';

const REASON_LABEL: Record<string, string> = {
  trial_grant: 'Trial grant',
  purchase: 'Purchase',
  reserve: 'Generation reserve',
  refund: 'Refund',
  manual_adjustment: 'Manual adjustment',
};

function describeLedgerEntry(item: {
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
}): string {
  if (item.reason === 'trial_grant') return 'Trial credits granted';
  if (item.reason === 'purchase') return 'Credit pack purchase';
  if (item.reason === 'manual_adjustment') return 'Manual balance update by admin';

  if (item.reference_type === 'thumbnail_pipeline_run') {
    return item.reason === 'refund'
      ? 'Pipeline refund (unused generation credits)'
      : 'Pipeline run (video analysis + thumbnail generation)';
  }

  if (item.reference_type === 'project') {
    return item.reason === 'refund'
      ? 'Project generation refund'
      : 'Project thumbnail generation';
  }

  if (item.reason === 'reserve') return 'Credits reserved for generation';
  if (item.reason === 'refund') return 'Credits refunded';
  if (item.reference_type) {
    return item.reference_id
      ? `${item.reference_type}:${item.reference_id}`
      : item.reference_type;
  }
  return 'Operation';
}

export default function CreditsPricingPage() {
  const {
    data: credits,
    isError: creditsError,
    error: creditsErr,
    refetch: refetchCredits,
  } = useGenerationCredits();
  const {
    data: ledger,
    isPending: ledgerPending,
    isError: ledgerError,
    error: ledgerErr,
    refetch: refetchLedger,
  } = useCreditLedger();

  useEffect(() => {
    trackEvent('credits_pack_viewed', {
      credits_balance: credits?.balance,
      credits_total_granted: credits?.totalGranted,
    });
  }, [credits?.balance, credits?.totalGranted]);

  return (
    <div className="space-y-10 pb-8">
      <SetPageFrame title="Credits" />

      <div className="flex justify-end sm:justify-start">
        <InfoHint
          buttonLabel="About credits and this page"
          helpBody={
            <p className="text-foreground">
              Credits fund thumbnail runs and edits. Your balance updates after each pipeline completes; refunds show up
              automatically when a run fails mid-flight or credits are reconciled after a faulty job.
            </p>
          }
        />
      </div>

      <section className="surface-dashboard relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-baseline justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SectionHeading
              title={<h3 className="text-base font-semibold text-foreground">Your balance</h3>}
              helpLabel="How your balance changes"
              helpBody={
                <p>
                  Each generation or edit consumes balance when the pipeline confirms spend. Amounts reconcile here — if a
                  run fails partially, refunds may arrive as ledger rows afterward.
                </p>
              }
            />
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="sr-only">Current credits: </span>
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {creditsError ? '—' : credits?.balance ?? '—'}
            </span>{' '}
            <span className="text-xs font-medium uppercase tracking-wide">credits</span>
          </p>
        </div>
        {creditsError ? (
          <div className="relative mt-4">
            <InlineLoadError
              message={creditsErr instanceof Error ? creditsErr.message : 'Could not load balance.'}
              onRetry={() => void refetchCredits()}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-4" aria-labelledby="credits-packs-heading">
        <SectionHeading
          title={
            <h3 id="credits-packs-heading" className="text-base font-semibold text-foreground">
              Credit packs
            </h3>
          }
          helpLabel="About credit packs on this screen"
          helpBody={
            <p>
              Packs describe one-time balances you buy to top up. Purchases CTAs stay disabled until checkout is wired —
              meanwhile use this grid to preview pricing tiers and reconcile what you intend to provision.
            </p>
          }
        />
        <CreditPacksGrid plans={pricingPlans} />
      </section>

      <section
        id="credits-history"
        className="surface-dashboard relative overflow-hidden rounded-2xl p-5 sm:p-6"
        aria-labelledby="credits-history-heading"
      >
        <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border/60 pb-4">
          <SectionHeading
            title={
              <h3 id="credits-history-heading" className="text-base font-semibold text-foreground">
                Credits history
              </h3>
            }
            helpLabel="How to read credits history"
            helpBody={
              <p>
                Every row mirrors a ledger mutation: grants, reserves for runs, completions, refunds, manual credits
                from support, etc. Prefer the expandable table below for granular timestamps and deltas.
              </p>
            }
          />
        </div>

        <details className="group relative [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left motion-base rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 -mx-1 px-1 hover:bg-muted/25">
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-sm font-medium text-foreground">Recent balance changes</span>
              <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                <InfoHint
                  className="pointer-events-auto"
                  buttonLabel="About the expandable ledger table"
                  helpBody={
                    <p>
                      Open this section to hydrate the detailed table variant of the ledger. It&apos;s the same underlying
                      data as summarized rows—you get timestamps, deltas, and running balances inline.
                    </p>
                  }
                />
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="overflow-x-auto pb-1 pt-1">
            {ledgerError ? (
              <InlineLoadError
                className="mt-2"
                message={ledgerErr instanceof Error ? ledgerErr.message : 'Could not load credits history.'}
                onRetry={() => void refetchLedger()}
              />
            ) : (
            <table className="min-w-full text-sm">
              <caption className="sr-only">Credits ledger: timestamps, reasons, amounts, balances</caption>
              <thead className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground/85">
                <tr>
                  <th className="border-b border-border/25 py-2.5 pr-3 font-medium">Date</th>
                  <th className="border-b border-border/25 py-2.5 pr-3 font-medium">Reason</th>
                  <th className="border-b border-border/25 py-2.5 pr-3 font-medium">Description</th>
                  <th className="border-b border-border/25 py-2.5 pr-2 text-right font-medium">Delta</th>
                  <th className="border-b border-border/25 py-2.5 pl-2 text-right font-medium">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {ledgerPending && !ledgerError ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="py-3 pr-3">
                        <Skeleton className="h-5 w-20 rounded-md" />
                      </td>
                      <td className="py-3 pr-3">
                        <Skeleton className="h-4 w-full max-w-[14rem]" />
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <Skeleton className="ml-auto h-4 w-10" />
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <Skeleton className="ml-auto h-4 w-10" />
                      </td>
                    </tr>
                  ))
                ) : ledgerError ? null : !ledger || ledger.length === 0 ? (
                  <tr>
                    <td className="p-0" colSpan={5}>
                      <div className="py-2">
                        <EmptyState
                          density="compact"
                          icon={<History className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
                          title="No ledger rows yet"
                          description="Runs from the generator and credit grants will populate this table automatically."
                        />
                      </div>
                    </td>
                  </tr>
                ) : (
                  ledger.map((item) => {
                    const isPositive = item.delta > 0;
                    const reasonLabel = REASON_LABEL[item.reason] ?? item.reason;
                    const description = describeLedgerEntry(item);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/12">
                        <td className="py-3 pr-3 text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex rounded-md bg-muted/35 px-2 py-0.5 text-xs font-medium text-foreground/85">
                            {reasonLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">{description}</td>
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
            )}
          </div>
        </details>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href={AppRoutes.create} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
          Back to generator
        </Link>
        <span className="text-muted-foreground" aria-hidden>
          ·
        </span>
        <a
          href="#credits-history"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Jump to history
        </a>
        <InfoHint
          buttonLabel="Enterprise credit options"
          helpBody={
            <p>
              Need another pack size or invoice-backed billing? Contact support — operational staff can manually
              provision balances tied to procurement workflows.
            </p>
          }
        />
      </div>
    </div>
  );
}
