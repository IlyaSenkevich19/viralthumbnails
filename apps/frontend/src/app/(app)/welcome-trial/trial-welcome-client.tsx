'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppRoutes } from '@/config/routes';
import { useAuth } from '@/contexts/auth-context';
import { billingApi } from '@/lib/api';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

const VALUE_POINTS = [
  'Analyze a YouTube URL and find thumbnail-worthy moments',
  'Generate CTR-focused thumbnail concepts from real video frames',
  'Use templates and face references when you want stronger control',
] as const;

export function TrialWelcomeClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const { data: credits, isPending, isError } = useGenerationCredits();

  useEffect(() => {
    if (isPending || isError || !credits) return;
    if (credits.trialStarted) {
      router.replace(AppRoutes.create);
    }
  }, [credits, isError, isPending, router]);

  const startTrial = useMutation({
    mutationFn: () => billingApi.startCreditTrial(accessToken),
    onSuccess: (nextCredits) => {
      trackEvent('trial_started', {
        credits_balance: nextCredits.balance,
        credits_total_granted: nextCredits.totalGranted,
      });
      if (user?.id) {
        queryClient.setQueryData(queryKeys.billing.credits(user.id), nextCredits);
      }
      toast.success('Trial started');
      router.replace(AppRoutes.create);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Could not start your trial.';
      toast.error(message);
    },
  });

  const creditsCount = credits?.totalGranted ?? 3;
  const loading = authLoading || isPending;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-12rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <SetPageFrame title="Start free trial" />

      <section className="space-y-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Free trial included
        </div>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Start with {creditsCount} thumbnail generations.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            ViralThumblify is a paid product, but your first credits are free so you can test the
            YouTube thumbnail pipeline on real videos before buying a pack.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: `${creditsCount} credits`, detail: 'Included trial balance' },
            { label: 'No card', detail: 'Start without checkout' },
            { label: 'Paid later', detail: 'Upgrade when credits run out' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-card/55 p-4 shadow-sm shadow-black/10"
            >
              <p className="text-lg font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <Card className="relative overflow-hidden border-white/[0.08] bg-card/70 p-6 shadow-2xl shadow-black/25">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              What you unlock
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              Generate before you pay
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the trial to validate quality. When the credits are gone, we&apos;ll show credit
              packs before the next paid action.
            </p>
          </div>

          <div className="space-y-3">
            {VALUE_POINTS.map((point) => (
              <div key={point} className="flex gap-3 rounded-xl bg-background/35 p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-5 text-foreground">{point}</p>
              </div>
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className={cn('w-full gap-2', startTrial.isPending && 'opacity-80')}
            onClick={() => startTrial.mutate()}
            disabled={loading || startTrial.isPending || !accessToken}
          >
            {startTrial.isPending ? 'Starting trial...' : 'Start free trial'}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            No subscription starts today. Credits are consumed only when you generate or edit
            thumbnails.
          </p>
        </div>
      </Card>
    </div>
  );
}
