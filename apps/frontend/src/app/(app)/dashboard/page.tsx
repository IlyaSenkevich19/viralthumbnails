'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase, nestApi } from '@/lib/api';
import { LeadsTable } from '@/components/table/leads-table';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

function DashboardContent() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId')
    ? parseInt(searchParams.get('campaignId')!, 10)
    : undefined;
  const [leads, setLeads] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  function refreshLeads() {
    supabase.leads
      .list({ campaignId, limit: 50 })
      .then(setLeads)
      .catch(() => setLeads([]));
  }

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    supabase.leads
      .list({ campaignId, limit: 50 })
      .then(setLeads)
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [accessToken, campaignId]);

  async function handleScanNow() {
    setScanning(true);
    try {
      await nestApi.reddit.scanNow();
      refreshLeads();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScanNow}
          disabled={scanning}
        >
          <Play className="h-4 w-4 mr-2" />
          {scanning ? 'Scanning...' : 'Scan now'}
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <LeadsTable data={leads} />
      )}
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
