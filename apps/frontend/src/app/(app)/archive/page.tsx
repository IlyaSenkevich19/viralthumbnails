'use client';

import { useState } from 'react';
import { Archive } from 'lucide-react';
import { ArchiveFilters } from '@/components/archive/archive-filters';

export default function ArchivePage() {
  const [filterId, setFilterId] = useState('all');
  const [sortId, setSortId] = useState('processed');
  const totalCount = 0; // TODO: wire to archive API

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Archive className="h-7 w-7 text-slate-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Processed and closed leads. Review past conversations, replies, and outcomes in one place.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <ArchiveFilters
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
              <Archive className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-medium text-slate-700">Archive is empty</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              When you reply to a lead or mark it as done, it will appear here so you can track what
              you&apos;ve already handled.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {/* Placeholder: archived item cards */}
          </ul>
        )}
      </div>
    </div>
  );
}
