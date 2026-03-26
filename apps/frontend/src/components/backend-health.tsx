'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBackendHealth } from '@/lib/hooks';

export function BackendHealth() {
  const { isPending, isSuccess } = useBackendHealth();

  if (isPending) {
    return <Badge className="border-border bg-secondary text-muted-foreground">API: ...</Badge>;
  }
  if (isSuccess) {
    return (
      <Badge
        className={cn(
          'border-emerald-500/30 bg-emerald-600 text-white shadow-sm',
          'hover:bg-emerald-600 motion-base',
        )}
      >
        API: OK
      </Badge>
    );
  }
  return (
    <Badge className="motion-base border-red-800/50 bg-red-700 text-white hover:bg-red-600">
      API: unreachable
    </Badge>
  );
}
