'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vtSpring, vtStagger } from '@/lib/motion-presets';
import type { PricingPlan } from '@/config/pricing-plans';

export type CreditPacksGridProps = {
  plans: PricingPlan[];
  checkoutDisabled?: boolean;
  /** Override grid columns e.g. overlay: `sm:grid-cols-2 xl:grid-cols-4` */
  className?: string;
};

export function CreditPacksGrid({
  plans,
  checkoutDisabled = true,
  className,
}: CreditPacksGridProps) {
  const reduceMotion = useReducedMotion();
  const itemVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 14, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: vtSpring.reveal },
      };

  return (
    <motion.div
      className={cn('grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch', className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduceMotion ? 0 : vtStagger.card,
            delayChildren: reduceMotion ? 0 : 0.03,
          },
        },
      }}
    >
      {plans.map((plan) => (
        <motion.div
          key={plan.id}
          variants={itemVariants}
          className={cn(
            'surface relative flex min-h-0 flex-col rounded-2xl p-5 sm:p-6',
            plan.featured &&
              'border-primary/55 py-6 ring-2 ring-primary/35 shadow-lg shadow-black/28 sm:py-7',
          )}
        >
          {plan.badge ? (
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-md shadow-black/35">
              {plan.badge}
            </span>
          ) : null}

          <div className="mb-3 sm:mb-4">
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <p className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{plan.price}</span>
              <span className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {plan.credits} credits
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
          </div>

          <ul className="mb-4 flex flex-1 flex-col gap-2 text-sm text-foreground sm:mb-6 sm:gap-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/95" strokeWidth={2} aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            className="mt-auto w-full rounded-xl shadow-none"
            variant={
              plan.ctaStyle === 'outline' ? 'outline' : plan.ctaStyle === 'gold' ? 'secondary' : 'default'
            }
            disabled={checkoutDisabled}
          >
            {plan.cta}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
