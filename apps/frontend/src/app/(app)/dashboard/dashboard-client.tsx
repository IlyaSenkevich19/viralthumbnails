'use client';

import { DashboardCreateHub } from '@/components/dashboard/dashboard-create-hub';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { TrialPaywallSurfaces } from '@/components/paywall/trial-paywall-surfaces';

export function DashboardClient() {
  return (
    <div className="space-y-8">
      <SetPageFrame title="Dashboard" />
      <TrialPaywallSurfaces />

      <DashboardCreateHub />
    </div>
  );
}
