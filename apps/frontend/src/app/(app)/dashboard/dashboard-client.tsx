'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNewProject } from '@/contexts/new-project-context';
import { AppRoutes, AppSearchParams } from '@/config/routes';
import { DashboardCreateHub } from '@/components/dashboard/dashboard-create-hub';

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
      <Suspense fallback={null}>
        <DashboardOpenNewProjectFromUrl />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Start here; use <span className="text-foreground/90">Projects</span> in the sidebar for your
            library and drafts.
          </p>
        </div>
      </div>

      <DashboardCreateHub />
    </div>
  );
}
