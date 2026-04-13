'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { billingApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useCreditLedger() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: queryKeys.billing.creditsLedger(userId ?? '__pending__'),
    queryFn: () => billingApi.getCreditLedger(accessToken!),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
}

