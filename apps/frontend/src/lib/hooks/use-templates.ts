'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { templatesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const NICHE_ALL = 'all' as const;

export function useTemplateNiches() {
  const { accessToken, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: queryKeys.templates.niches(),
    queryFn: () => templatesApi.listTemplateNiches(accessToken!),
    enabled: !authLoading && Boolean(accessToken),
    staleTime: 60 * 60 * 1000,
  });
}

export function useTemplatesList(nicheFilter: string | typeof NICHE_ALL) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const nicheKey = nicheFilter === NICHE_ALL ? NICHE_ALL : nicheFilter;
  const nicheParam = nicheFilter === NICHE_ALL ? undefined : nicheFilter;

  return useQuery({
    queryKey: queryKeys.templates.list(userId ?? '__pending__', nicheKey),
    queryFn: () => templatesApi.listTemplates(accessToken!, { niche: nicheParam }),
    enabled: !authLoading && Boolean(userId && accessToken),
  });
}

export { NICHE_ALL };
