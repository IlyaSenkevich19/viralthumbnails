'use client';

import type { ReactNode } from 'react';
import { LeadQualificationModal } from '@/components/onboarding/lead-qualification-modal';
import { useAuth } from '@/contexts/auth-context';

/**
 * After any signup (email or Google), new users must complete the same lead questions before the trial welcome flow.
 * Renders the app shell underneath (inert) so layout state stays warm; a modal blocks interaction until done.
 */
export function LeadQualificationGate({ children }: { children: ReactNode }) {
  const { user, accessToken, isLoading, leadQualificationCompleted, refreshAuthBootstrap } = useAuth();

  const signedIn = Boolean(user && accessToken);

  if (!signedIn || isLoading || leadQualificationCompleted !== false) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="pointer-events-none min-h-[100dvh] select-none" aria-hidden>
        {children}
      </div>
      {accessToken ? (
        <LeadQualificationModal
          accessToken={accessToken}
          onCompleted={async () => {
            await refreshAuthBootstrap();
          }}
        />
      ) : null}
    </>
  );
}
