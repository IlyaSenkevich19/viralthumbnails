'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { billingApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export type GenerationCredits = {
  balance: number;
  quota: number;
};

export function useGenerationCredits() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.billing.credits(userId ?? '__pending__'),
    queryFn: () => billingApi.getGenerationCredits(accessToken!),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
}
