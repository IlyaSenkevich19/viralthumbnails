'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LeadsTable } from '@/components/table/leads-table';
import { LeadsTableSkeleton } from '@/components/table/leads-table-skeleton';
import { CampaignFilter } from '@/components/leads/campaign-filter';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useCampaigns, useLeads, useScanNow } from '@/lib/queries';
import { useProject } from '@/contexts/project-context';

function LeadsContent() {
  const searchParams = useSearchParams();
  const { projectId } = useProject();
  const campaignIdParam = searchParams.get('campaignId');
  const campaignId = campaignIdParam ? parseInt(campaignIdParam, 10) : null;

  const { data: campaigns = [], isLoading: loadingCampaigns } = useCampaigns(projectId);
  const campaignIds = campaigns.map((c) => c.id);
  const leadsParams = campaignId != null
    ? { campaignId, limit: 50 as const }
    : { campaignIds, limit: 50 as const };

  const {
    data: leads = [],
    isLoading: loadingLeads,
    refetch: refetchLeads,
    isError: leadsError,
    error: leadsErrorDetail,
  } = useLeads(leadsParams);
  const { mutateAsync: scanNow, isPending: scanning } = useScanNow();

  async function handleScanNow() {
    await scanNow();
    refetchLeads();
  }

  const selectedCampaign = campaignId != null ? campaigns.find((c) => c.id === campaignId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-slate-500 mt-1">
          High-intent Reddit posts scored by AI. Filter by campaign, generate replies, export.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CampaignFilter
            campaigns={campaigns}
            selectedCampaignId={campaignId}
            isLoading={loadingCampaigns}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanNow}
            disabled={scanning}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 shrink-0"
          >
            <Play className="h-4 w-4 mr-2" />
            {scanning ? 'Scanning…' : 'Scan now'}
          </Button>
        </div>
        {selectedCampaign && (
          <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
            Showing leads for <span className="font-medium text-slate-600">{selectedCampaign.name}</span>
          </p>
        )}
      </div>

      {loadingLeads ? (
        <LeadsTableSkeleton />
      ) : leadsError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center">
          <p className="text-red-800 font-medium">Failed to load leads</p>
          <p className="text-sm text-red-600 mt-1">
            {leadsErrorDetail instanceof Error ? leadsErrorDetail.message : 'Unknown error'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => refetchLeads()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <LeadsTable data={Array.isArray(leads) ? leads : []} />
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LeadsTableSkeleton />}>
      <LeadsContent />
    </Suspense>
  );
}
