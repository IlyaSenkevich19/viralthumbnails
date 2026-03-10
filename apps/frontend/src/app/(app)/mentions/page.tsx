'use client';

import { useState } from 'react';
import { AtSign } from 'lucide-react';
import { MentionsFilters } from '@/components/mentions/mentions-filters';

export default function MentionsPage() {
  const [filterId, setFilterId] = useState('all');
  const [sortId, setSortId] = useState('recent');
  const totalCount = 0; // TODO: wire to mentions API

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <AtSign className="h-7 w-7 text-slate-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Mentions</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Reddit posts where your brand or product is mentioned. Engage with these conversations to
          build trust and visibility.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <MentionsFilters
          filterId={filterId}
          onFilterChange={setFilterId}
          sortId={sortId}
          onSortChange={setSortId}
          totalCount={totalCount}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <AtSign className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-medium text-slate-700">No mentions yet</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              When someone mentions your brand on Reddit, it will show up here so you can reply and
              stay on top of the conversation.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {/* Placeholder: mention cards */}
          </ul>
        )}
      </div>
    </div>
  );
}
