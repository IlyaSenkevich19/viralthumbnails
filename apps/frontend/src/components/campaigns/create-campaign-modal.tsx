'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { campaignsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CreateCampaignModal({
  onClose,
  onCreated,
  projectId,
}: {
  onClose: () => void;
  onCreated: () => void;
  projectId: number | null; // required: campaigns belong to a project
}) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [subredditsStr, setSubredditsStr] = useState('');
  const [scoreThreshold, setScoreThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    if (projectId == null) {
      setError('Please select a project first (use the project switcher).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await campaignsApi.createCampaign({
        name,
        keywords,
        subreddits,
        score_threshold: scoreThreshold,
        project_id: projectId,
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }

  return typeof document === 'undefined'
    ? null
    : createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-campaign-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className={cn(
              'w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200/80 my-6 mx-4 shrink-0',
              'max-h-[calc(100vh-3rem)] overflow-y-auto',
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2
            id="create-campaign-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            New campaign
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="campaign-name" className="text-sm font-medium text-slate-700">
              Name
            </label>
            <Input
              id="campaign-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SaaS leads"
              className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="campaign-keywords" className="text-sm font-medium text-slate-700">
              Keywords
            </label>
            <textarea
              id="campaign-keywords"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              placeholder="saas, software, looking for (one per line or comma-separated)"
              rows={3}
              className="flex w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 focus:bg-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="campaign-subreddits" className="text-sm font-medium text-slate-700">
              Subreddits
            </label>
            <textarea
              id="campaign-subreddits"
              value={subredditsStr}
              onChange={(e) => setSubredditsStr(e.target.value)}
              placeholder="startups, SaaS, entrepreneurship (without r/)"
              rows={3}
              className="flex w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 focus:bg-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="campaign-threshold" className="text-sm font-medium text-slate-700">
              Relevance threshold (0–100)
            </label>
            <Input
              id="campaign-threshold"
              type="number"
              min={0}
              max={100}
              value={scoreThreshold}
              onChange={(e) =>
                setScoreThreshold(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))
              }
              className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white w-24"
            />
            <p className="text-xs text-slate-500">
              Only posts with relevance at or above this score will be saved as leads.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 h-11 font-medium"
            >
              {loading ? 'Creating…' : 'Create campaign'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
