'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Circle, FileText, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All', icon: null },
  { id: 'high-intent', label: 'High Intent', icon: Circle },
  { id: 'my-keywords', label: 'My Keywords', icon: FileText },
  { id: 'competitor-keywords', label: 'Competitor Keywords', icon: Users },
] as const;

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'date', label: 'Date' },
  { id: 'score', label: 'Score' },
] as const;

export function SearchboxFilters({
  filterId,
  onFilterChange,
  sortId,
  onSortChange,
  totalCount,
}: {
  filterId: string;
  onFilterChange: (id: string) => void;
  sortId: string;
  onSortChange: (id: string) => void;
  totalCount: number;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortRef.current) return;
    const onOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const currentSort = SORT_OPTIONS.find((s) => s.id === sortId) ?? SORT_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = filterId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700',
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSelected ? 'text-orange-600' : 'text-slate-500',
                  )}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Results count + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">
          {totalCount} {totalCount === 1 ? 'post' : 'posts'} found
        </p>
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className={cn(
              'flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors',
              'hover:border-slate-300 hover:bg-slate-50',
              sortOpen && 'border-orange-300 ring-2 ring-orange-500/20',
            )}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
          >
            Sort by {currentSort.label}
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={s.id === sortId}
                  onClick={() => {
                    onSortChange(s.id);
                    setSortOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center px-3 py-2.5 text-left text-sm',
                    s.id === sortId
                      ? 'bg-orange-50 font-medium text-orange-800'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  Sort by {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
