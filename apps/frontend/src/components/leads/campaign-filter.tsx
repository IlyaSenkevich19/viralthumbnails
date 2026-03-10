'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/lib/types/campaign';

interface CampaignFilterProps {
  campaigns: Campaign[];
  selectedCampaignId: number | null;
  isLoading?: boolean;
  className?: string;
}

export function CampaignFilter({
  campaigns,
  selectedCampaignId,
  isLoading = false,
  className,
}: CampaignFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const selected = selectedCampaignId != null
    ? campaigns.find((c) => c.id === selectedCampaignId)
    : null;
  const label = selected ? selected.name : 'All campaigns';

  function select(id: number | null) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (id == null) {
      params.delete('campaignId');
    } else {
      params.set('campaignId', String(id));
    }
    router.push(`/leads${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
        Campaign
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        className={cn(
          'flex w-full min-w-[200px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm transition-colors',
          'hover:border-slate-300 hover:bg-slate-50',
          'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400',
          open && 'border-orange-300 ring-2 ring-orange-500/20',
          isLoading && 'pointer-events-none opacity-60',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">{isLoading ? 'Loading…' : label}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          <div className="overflow-y-auto py-1.5 max-h-[268px]">
            <button
              type="button"
              role="option"
              aria-selected={selectedCampaignId == null}
              onClick={() => select(null)}
              className={cn(
                'flex w-full items-center px-3 py-2.5 text-left text-sm',
                selectedCampaignId == null
                  ? 'bg-orange-50 font-medium text-orange-800'
                  : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              All campaigns
            </button>
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={c.id === selectedCampaignId}
                onClick={() => select(c.id)}
                className={cn(
                  'flex w-full items-center px-3 py-2.5 text-left text-sm',
                  c.id === selectedCampaignId
                    ? 'bg-orange-50 font-medium text-orange-800'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
