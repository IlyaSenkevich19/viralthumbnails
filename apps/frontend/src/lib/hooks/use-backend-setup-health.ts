'use client';

import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/contexts/auth-context';

export function useBackendSetupHealth() {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: queryKeys.healthSetup(),
    queryFn: () => healthApi.getSetupHealth(accessToken),
    staleTime: 30_000,
    retry: 1,
  });
}
