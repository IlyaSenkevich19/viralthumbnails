'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useProject } from '@/contexts/project-context';
import { useDashboardStats } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, MessageSquare, ArrowRight } from 'lucide-react';

function DashboardContent() {
  const { projectId } = useProject();
  const { data: stats, isLoading } = useDashboardStats(projectId);
  const campaignCount = stats?.campaignCount ?? 0;
  const leadCount = stats?.leadCount ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your Reddit lead generation.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="h-10 w-24 rounded-lg bg-slate-200 animate-pulse" />
              <div className="mt-2 h-6 w-32 rounded bg-slate-100 animate-pulse" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="h-10 w-24 rounded-lg bg-slate-200 animate-pulse" />
              <div className="mt-2 h-6 w-32 rounded bg-slate-100 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <MessageSquare className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{leadCount}</p>
                  <p className="text-sm text-slate-500">Total leads</p>
                </div>
              </div>
              <Link href="/leads" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700">
                View all leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Megaphone className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{campaignCount}</p>
                  <p className="text-sm text-slate-500">Active campaigns</p>
                </div>
              </div>
              <Link href="/campaigns" className="mt-4 flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700">
                Manage campaigns
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Getting started</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Create <Link href="/campaigns" className="text-orange-600 hover:underline">campaigns</Link> with keywords and subreddits to monitor.</li>
            <li>• Run a scan to find high-intent Reddit posts; they appear as leads.</li>
            <li>• Open <Link href="/leads" className="text-orange-600 hover:underline">Leads</Link> to review, score, and generate replies.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
