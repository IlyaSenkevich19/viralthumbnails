'use client';

import { type ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppRoutes } from '@/config/routes';
import { useAuth } from '@/contexts/auth-context';

export function TrialWelcomeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    accessToken,
    user,
    trialStarted,
    isLoading: authLoading,
  } = useAuth();

  const isWelcomeRoute = pathname === AppRoutes.welcomeTrial;
  const isSignedIn = Boolean(user && accessToken);

  useEffect(() => {
    if (authLoading || !isSignedIn || isWelcomeRoute) return;
    if (trialStarted === false) router.replace(AppRoutes.welcomeTrial);
  }, [authLoading, isSignedIn, isWelcomeRoute, pathname, router, trialStarted]);

  return <>{children}</>;
}
