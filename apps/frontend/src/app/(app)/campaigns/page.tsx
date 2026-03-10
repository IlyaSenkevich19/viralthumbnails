'use client';

import { useState } from 'react';
import { useCampaigns } from '@/lib/queries';
import { useProject } from '@/contexts/project-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CampaignCardSkeleton } from '@/components/skeletons/campaign-card-skeleton';
import { Plus } from 'lucide-react';
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Campaign } from '@/lib/types/campaign';

export default function CampaignsPage() {
  const { projectId } = useProject();
  const [campaignsState, setCampaignsState] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data,
    refetch,
  } = useCampaigns(projectId);

  const campaignsData = data ?? [];
  const campaigns = campaignsState.length ? campaignsState : campaignsData;
  const showSkeleton = data === undefined;
  const showEmpty = data !== undefined && campaigns.length === 0;

  function handleCreated() {
    setShowCreate(false);
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Configure which keywords and subreddits your scanner tracks.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          size="sm"
          className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-soft hover:from-orange-600 hover:to-red-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {showSkeleton ? (
        <CampaignCardSkeleton />
      ) : showEmpty ? (
        <Card className="glass rounded-2xl border-0 shadow-soft overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-slate-600 font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create a campaign to start monitoring Reddit for high-intent posts.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const keywordCount = (c.keywords ?? []).length;
            const maxKeywords = 12;
            const keywordProgress = Math.min(
              100,
              (keywordCount / maxKeywords) * 100 || 10,
            );

            return (
              <Card
                key={c.id}
                className={`glass rounded-2xl border-0 shadow-soft hover:shadow-premium transition-colors ${
                  !c.is_active ? 'opacity-70' : ''
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <Badge variant={c.is_active ? 'success' : 'glass'}>
                      {c.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {(c.keywords ?? []).slice(0, 3).join(', ') ||
                      'No keywords yet'}
                    {(c.keywords ?? []).length > 3 && '…'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subreddits: r/
                    {(c.subreddits ?? []).slice(0, 2).join(', r/') || 'all'}
                    {(c.subreddits ?? []).length > 2 && '…'}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Keyword coverage</span>
                      <span>
                        {keywordCount}/{maxKeywords}
                      </span>
                    </div>
                    <Progress value={keywordProgress} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a href={`/leads?campaignId=${c.id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-xl glass border-border hover:bg-white/10"
                      >
                        View Leads
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl hover:bg-white/5"
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          projectId={projectId}
        />
      )}
    </div>
  );
}
