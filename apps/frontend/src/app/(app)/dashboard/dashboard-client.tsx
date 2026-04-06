'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNewProject } from '@/contexts/new-project-context';
import { AppRoutes, AppSearchParams } from '@/config/routes';
import { DashboardCreateHub } from '@/components/dashboard/dashboard-create-hub';
import { SetPageFrame } from '@/components/layout/set-page-frame';

function DashboardOpenNewProjectFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openNewProject } = useNewProject();

  useEffect(() => {
    if (searchParams.get(AppSearchParams.openNewProject) !== '1') return;
    const q: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k !== AppSearchParams.openNewProject) q[k] = v;
    });
    openNewProject(q);
    router.replace(AppRoutes.dashboard);
  }, [searchParams, openNewProject, router]);

  return null;
}

export function DashboardClient() {
  return (
    <div className="space-y-8">
      <SetPageFrame title="Dashboard" />
      <Suspense fallback={null}>
        <DashboardOpenNewProjectFromUrl />
      </Suspense>

      <DashboardCreateHub />
    </div>
  );
}
