'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { queryKeys } from '@/lib/query-keys';

const STALE_MS = 5 * 60 * 1000;

export function useAdminStatus() {
  const { user, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: queryKeys.auth.adminStatus(user?.id),
    queryFn: async (): Promise<{ isAdmin: boolean }> => {
      const res = await fetch('/api/auth/admin-status');
      if (!res.ok) return { isAdmin: false };
      return (await res.json()) as { isAdmin: boolean };
    },
    enabled: !authLoading && Boolean(user?.id),
    staleTime: STALE_MS,
  });
}
