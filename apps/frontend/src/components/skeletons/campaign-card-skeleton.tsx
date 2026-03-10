'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CampaignCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-[280px] lg:min-w-0">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-full max-w-[200px] rounded" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
