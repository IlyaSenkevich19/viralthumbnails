'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { X } from 'lucide-react';

export function CreateCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [subredditsStr, setSubredditsStr] = useState('');
  const [scoreThreshold, setScoreThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    const keywords = keywordsStr.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
    const subreddits = subredditsStr
      .split(/[,\n]/)
      .map((s) => s.replace(/^r\/?/, '').trim())
      .filter(Boolean);
    if (!name || !keywords.length || !subreddits.length) {
      setError('Name, keywords, and subreddits are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await supabase.campaigns.create({
        name,
        keywords,
        subreddits,
        score_threshold: scoreThreshold,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold">New Campaign</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SaaS leads"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Keywords (comma or newline)
              </label>
              <Input
                value={keywordsStr}
                onChange={(e) => setKeywordsStr(e.target.value)}
                placeholder="saas, software, looking for"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Subreddits (comma or newline)
              </label>
              <Input
                value={subredditsStr}
                onChange={(e) => setSubredditsStr(e.target.value)}
                placeholder="startups, SaaS, entrepreneurship"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Score threshold (0-100)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={scoreThreshold}
                onChange={(e) =>
                  setScoreThreshold(parseInt(e.target.value, 10) || 80)
                }
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
