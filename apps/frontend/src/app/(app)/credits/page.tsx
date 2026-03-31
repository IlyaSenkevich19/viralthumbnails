'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import { pricingPlans } from '@/config/pricing-plans';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CreditsPricingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Simple, creator-friendly pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Plans and limits below are previews. Secure checkout (e.g. Stripe) will unlock upgrades and
          top-ups once billing is connected.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-foreground">
        <strong className="font-semibold">Checkout not enabled yet.</strong>{' '}
        <span className="text-muted-foreground">
          You can keep using trial credits from your account. We&apos;ll turn on payments here when
          ready.
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft',
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
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-sm font-medium text-muted-foreground">{plan.period}</span>
                ) : null}
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

      <p className="text-center text-xs text-muted-foreground">
        Questions about pricing? Contact us through your usual support channel.{' '}
        <Link href={AppRoutes.dashboard} className="text-primary underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
