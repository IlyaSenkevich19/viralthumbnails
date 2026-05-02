'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  PROJECTS_DEFAULT_PAGE_SIZE,
  PROJECTS_PAGE_SIZE_OPTIONS,
  parseProjectsPageSizeParam,
} from '@/lib/api/projects';

export const PROJECTS_PAGE_QUERY = 'page' as const;
export const PROJECTS_Q_QUERY = 'q' as const;
export const PROJECTS_LIMIT_QUERY = 'limit' as const;

export const PROJECTS_SEARCH_DEBOUNCE_MS = 350;

/** URL + draft search state for the Projects list (`?page=` / `?q=` / `?limit=`). */
export function useProjectsListRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const page = useMemo(() => {
    const p = parseInt(searchParams.get(PROJECTS_PAGE_QUERY) ?? '1', 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  }, [searchParams]);

  const limit = useMemo(
    () => parseProjectsPageSizeParam(searchParams.get(PROJECTS_LIMIT_QUERY)),
    [searchParams],
  );

  const qFromUrl = useMemo(() => (searchParams.get(PROJECTS_Q_QUERY) ?? '').trim(), [searchParams]);

  const rawQFromUrl = searchParams.get(PROJECTS_Q_QUERY) ?? '';
  const [draftQ, setDraftQ] = useState(rawQFromUrl);

  useEffect(() => {
    setDraftQ(rawQFromUrl);
  }, [rawQFromUrl]);

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      mutate(params);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, startTransition],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const nextTrim = draftQ.trim();
      const urlTrim = (searchParamsRef.current.get(PROJECTS_Q_QUERY) ?? '').trim();
      if (nextTrim === urlTrim) return;
      replaceSearchParams((params) => {
        if (!nextTrim) params.delete(PROJECTS_Q_QUERY);
        else params.set(PROJECTS_Q_QUERY, nextTrim);
        params.delete(PROJECTS_PAGE_QUERY);
      });
    }, PROJECTS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draftQ, replaceSearchParams]);

  const searchDirty = draftQ.trim() !== qFromUrl;

  const setPage = useCallback(
    (next: number) => {
      replaceSearchParams((params) => {
        if (next <= 1) params.delete(PROJECTS_PAGE_QUERY);
        else params.set(PROJECTS_PAGE_QUERY, String(next));
      });
    },
    [replaceSearchParams],
  );

  const setLimit = useCallback(
    (next: number) => {
      replaceSearchParams((params) => {
        const n = parseProjectsPageSizeParam(String(next));
        if (n === PROJECTS_DEFAULT_PAGE_SIZE) params.delete(PROJECTS_LIMIT_QUERY);
        else params.set(PROJECTS_LIMIT_QUERY, String(n));
        params.delete(PROJECTS_PAGE_QUERY);
      });
    },
    [replaceSearchParams],
  );

  const clearSearch = useCallback(() => {
    setDraftQ('');
    replaceSearchParams((params) => {
      params.delete(PROJECTS_Q_QUERY);
      params.delete(PROJECTS_PAGE_QUERY);
    });
  }, [replaceSearchParams]);

  useEffect(() => {
    const raw = searchParams.get(PROJECTS_LIMIT_QUERY);
    if (raw == null || raw === '') return;
    const n = parseInt(raw, 10);
    if (!(PROJECTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) {
      replaceSearchParams((params) => {
        params.delete(PROJECTS_LIMIT_QUERY);
        params.delete(PROJECTS_PAGE_QUERY);
      });
    }
  }, [replaceSearchParams, searchParams]);

  return {
    page,
    limit,
    qFromUrl,
    draftQ,
    setDraftQ,
    /** Query is committed to the URL (`q` differs from trimmed draft until debounce settles). */
    searchDirty,
    setPage,
    setLimit,
    clearSearch,
  };
}
