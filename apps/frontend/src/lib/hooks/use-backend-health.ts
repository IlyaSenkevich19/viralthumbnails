'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

async function fetchHealth(): Promise<'ok'> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('unhealthy');
  return 'ok';
}

export function useBackendHealth() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: fetchHealth,
    staleTime: 30_000,
    retry: 1,
  });
}
