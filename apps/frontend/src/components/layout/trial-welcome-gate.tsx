'use client';

import { type ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { AppRoutes } from '@/config/routes';
import { useAuth } from '@/contexts/auth-context';
import { useGenerationCredits } from '@/lib/hooks/use-generation-credits';

/**
 * Sends signed-in users to `/welcome-trial` until `startCreditTrial` has run once.
 * Persisted via `trial_started_at` — not tied to login session count.
 */
export function TrialWelcomeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const {
    data: credits,
    isPending: creditsPending,
    isError: creditsError,
  } = useGenerationCredits();

  const isWelcomeRoute = pathname === AppRoutes.welcomeTrial;
  const isSignedIn = Boolean(user && accessToken);

  useEffect(() => {
    if (authLoading || !isSignedIn || isWelcomeRoute) return;
    if (creditsPending || creditsError || !credits) return;
    if (credits.trialStarted) return;
    router.replace(AppRoutes.welcomeTrial);
  }, [
    authLoading,
    isSignedIn,
    isWelcomeRoute,
    creditsPending,
    creditsError,
    credits,
    router,
  ]);

  const awaitsTrialDecision =
    isSignedIn && !authLoading && !isWelcomeRoute && creditsPending && !creditsError;

  if (awaitsTrialDecision) {
    return (
      <div
        className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading account"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
        <span className="sr-only">Loading account</span>
      </div>
    );
  }

  return <>{children}</>;
}
