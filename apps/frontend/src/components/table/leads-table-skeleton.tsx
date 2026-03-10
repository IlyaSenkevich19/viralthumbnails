'use client';

import { Skeleton } from '@/components/ui/skeleton';

const ROWS = 5;

export function LeadsTableSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
              Relevance
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Post
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
              Subreddit
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
              Date
            </th>
            <th className="px-5 py-3.5 w-[1%]" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROWS }).map((_, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 last:border-0"
            >
              <td className="px-5 py-4">
                <Skeleton className="h-6 w-14 rounded-full" />
              </td>
              <td className="px-5 py-4">
                <div className="space-y-2 max-w-[320px]">
                  <Skeleton className="h-4 w-full max-w-[280px] rounded" />
                  <Skeleton className="h-3 w-full max-w-[240px] rounded" />
                </div>
              </td>
              <td className="px-5 py-4">
                <Skeleton className="h-3.5 w-20 rounded" />
              </td>
              <td className="px-5 py-4">
                <Skeleton className="h-3.5 w-16 rounded" />
              </td>
              <td className="px-5 py-4 text-right">
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
