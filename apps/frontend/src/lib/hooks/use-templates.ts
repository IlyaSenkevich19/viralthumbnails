'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import {
  templatesApi,
  TEMPLATES_DEFAULT_PAGE_SIZE,
  TEMPLATE_PAGE_SIZE_OPTIONS,
} from '@/lib/api';
import type { PaginatedTemplatesResponse } from '@/lib/api/templates';
import { queryKeys } from '@/lib/query-keys';

const NICHE_ALL = 'all' as const;

const TEMPLATES_LIST_STALE_MS = 45_000;

export { TEMPLATES_DEFAULT_PAGE_SIZE, TEMPLATE_PAGE_SIZE_OPTIONS };

export function useTemplateNiches() {
  const { accessToken, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: queryKeys.templates.niches(),
    queryFn: () => templatesApi.listTemplateNiches(accessToken!),
    enabled: !authLoading && Boolean(accessToken),
    staleTime: 60 * 60 * 1000,
  });
}

export function useTemplatesList(
  nicheFilter: string | typeof NICHE_ALL,
  page: number = 1,
  limit: number = TEMPLATES_DEFAULT_PAGE_SIZE,
) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const nicheKey = nicheFilter === NICHE_ALL ? NICHE_ALL : nicheFilter;
  const nicheParam = nicheFilter === NICHE_ALL ? undefined : nicheFilter;
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1;

  return useQuery({
    queryKey: queryKeys.templates.list(userId ?? '__pending__', nicheKey, safePage, limit),
    queryFn: () =>
      templatesApi.listTemplates(accessToken!, {
        niche: nicheParam,
        page: safePage,
        limit,
      }),
    enabled: !authLoading && Boolean(userId && accessToken),
    /** Keep prior slice visible only when niche and page size match (avoid wrong niche/limit flash). */
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery?.queryKey || previousQuery.queryKey.length < 6) {
        return undefined;
      }
      const key = previousQuery.queryKey;
      const prevNiche = String(key[3]);
      const prevLimit = Number(key[5]);
      if (prevNiche !== nicheKey || prevLimit !== limit) return undefined;
      return previousData as PaginatedTemplatesResponse;
    },
    staleTime: TEMPLATES_LIST_STALE_MS,
  });
}

/** Prefetch previous/next page for snappier pagination (same niche & page size). */
export function usePrefetchAdjacentTemplates(
  nicheFilter: string | typeof NICHE_ALL,
  page: number,
  limit: number,
  total: number | undefined,
) {
  const queryClient = useQueryClient();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const nicheKey = nicheFilter === NICHE_ALL ? NICHE_ALL : nicheFilter;
  const nicheParam = nicheFilter === NICHE_ALL ? undefined : nicheFilter;
  const safePage = Number.isFinite(page) && page >= 1 ? page : 1;

  useEffect(() => {
    if (authLoading || !userId || !accessToken || total == null || total <= 0) return;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const prefetch = (p: number) => {
      if (p < 1 || p > totalPages) return;
      void queryClient.prefetchQuery({
        queryKey: queryKeys.templates.list(userId, nicheKey, p, limit),
        queryFn: () =>
          templatesApi.listTemplates(accessToken, {
            niche: nicheParam,
            page: p,
            limit,
          }),
        staleTime: TEMPLATES_LIST_STALE_MS,
      });
    };
    prefetch(safePage + 1);
    prefetch(safePage - 1);
  }, [
    accessToken,
    authLoading,
    limit,
    nicheKey,
    nicheParam,
    queryClient,
    safePage,
    total,
    userId,
  ]);
}

export { NICHE_ALL };
