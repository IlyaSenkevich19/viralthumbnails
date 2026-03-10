'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { SearchboxFilters } from '@/components/searchbox/searchbox-filters';

export default function SearchboxPage() {
  const [filterId, setFilterId] = useState('all');
  const [sortId, setSortId] = useState('relevance');
  const totalCount = 0; // TODO: wire to real search results

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <div className="flex items-center gap-2">
          <Search className="h-7 w-7 text-slate-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Searchbox</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          The following Reddit posts are showing up when people google for keywords related to you or
          your competitors. Commenting on these posts will guarantee more eyeballs on your product and
          if done right more sales.
        </p>
      </div>

      {/* Filters + results count + sort */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <SearchboxFilters
          filterId={filterId}
          onFilterChange={setFilterId}
          sortId={sortId}
          onSortChange={setSortId}
          totalCount={totalCount}
        />
      </div>

      {/* Results area */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Search className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-medium text-slate-700">No posts yet</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              Search results will appear here when you run a search or connect your keywords.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {/* Placeholder for future post cards */}
          </ul>
        )}
      </div>
    </div>
  );
}
