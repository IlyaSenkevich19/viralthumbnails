'use client';

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal';

interface Campaign {
  id: number;
  name: string;
  keywords: string[];
  subreddits: string[];
  score_threshold: number;
  is_active: boolean;
  created_at: string;
}

export default function CampaignsPage() {
  const { accessToken } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    supabase.campaigns
      .list()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleCreated() {
    setShowCreate(false);
    if (accessToken) {
      supabase.campaigns.list().then(setCampaigns);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Keywords: {(c.keywords ?? []).slice(0, 3).join(', ')}
                  {(c.keywords ?? []).length > 3 && '...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Subreddits: r/{(c.subreddits ?? []).slice(0, 2).join(', r/')}
                  {(c.subreddits ?? []).length > 2 && '...'}
                </p>
                <p className="text-xs">
                  Score threshold: {c.score_threshold} ·{' '}
                  {c.is_active ? 'Active' : 'Paused'}
                </p>
                <a
                  href={`/dashboard?campaignId=${c.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View leads →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {campaigns.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-12">
          No campaigns yet. Create one to start monitoring Reddit.
        </p>
      )}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
