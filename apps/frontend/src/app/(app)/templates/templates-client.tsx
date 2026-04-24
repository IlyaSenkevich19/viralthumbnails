'use client';

import { useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { LayoutTemplate } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  NICHE_ALL,
  TEMPLATES_DEFAULT_PAGE_SIZE,
  TEMPLATE_PAGE_SIZE_OPTIONS,
  usePrefetchAdjacentTemplates,
  useTemplateNiches,
  useTemplatesList,
} from '@/lib/hooks';
import {
  parseTemplatePageSizeParam,
} from '@/lib/api/templates';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';
import { TemplatesPagination } from '@/components/templates/templates-pagination';
import { cn } from '@/lib/utils';

const NICHE_QUERY = 'niche';
const PAGE_QUERY = 'page';
const LIMIT_QUERY = 'limit';

export function TemplatesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const hasSession = Boolean(user?.id && accessToken);

  const { data: niches = [] } = useTemplateNiches();
  const nicheCodes = useMemo(() => new Set(niches.map((n) => n.code)), [niches]);
  const nicheLabel = useMemo(() => {
    const m = new Map(niches.map((n) => [n.code, n.label]));
    return (code: string) => m.get(code) ?? code;
  }, [niches]);

  const rawNiche = searchParams.get(NICHE_QUERY);
  const nichesReady = niches.length > 0;
  const selectedNiche = useMemo(() => {
    if (!rawNiche) return NICHE_ALL;
    if (!nichesReady) return rawNiche;
    return nicheCodes.has(rawNiche) ? rawNiche : NICHE_ALL;
  }, [rawNiche, nichesReady, nicheCodes]);

  const rawPage = searchParams.get(PAGE_QUERY);
  const page = useMemo(() => {
    const p = parseInt(rawPage ?? '1', 10);
    return Number.isFinite(p) && p >= 1 ? p : 1;
  }, [rawPage]);

  const rawLimit = searchParams.get(LIMIT_QUERY);
  const pageSize = useMemo(() => parseTemplatePageSizeParam(rawLimit), [rawLimit]);

  const setNiche = useCallback(
    (next: string | typeof NICHE_ALL) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === NICHE_ALL) {
        params.delete(NICHE_QUERY);
      } else {
        params.set(NICHE_QUERY, next);
      }
      params.delete(PAGE_QUERY);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setLimit = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(PAGE_QUERY);
      if (next === TEMPLATES_DEFAULT_PAGE_SIZE) {
        params.delete(LIMIT_QUERY);
      } else {
        params.set(LIMIT_QUERY, String(next));
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) {
        params.delete(PAGE_QUERY);
      } else {
        params.set(PAGE_QUERY, String(next));
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (niches.length === 0 || !rawNiche) return;
    if (!niches.some((n) => n.code === rawNiche)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(NICHE_QUERY);
      params.delete(PAGE_QUERY);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [niches, pathname, rawNiche, router, searchParams]);

  useEffect(() => {
    if (rawLimit == null || rawLimit === '') return;
    const n = parseInt(rawLimit, 10);
    if (!(TEMPLATE_PAGE_SIZE_OPTIONS as readonly number[]).includes(n)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(LIMIT_QUERY);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [pathname, rawLimit, router, searchParams]);

  const {
    data,
    isPending,
    isFetching,
    isPlaceholderData,
    isError,
    error,
  } = useTemplatesList(selectedNiche, page, pageSize);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? pageSize;

  usePrefetchAdjacentTemplates(selectedNiche, page, pageSize, data?.total);

  useEffect(() => {
    if (!data || isPending) return;
    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [data, isPending, page, setPage]);

  const loading = authLoading || (hasSession && isPending && !data);
  const paginationBusy = Boolean(isFetching && isPlaceholderData);
  const listError =
    !authLoading && !hasSession
      ? 'Not signed in'
      : isError
        ? (error as Error).message
        : null;

  return (
    <div className="space-y-6">
      {hasSession && niches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Niche</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectedNiche === NICHE_ALL ? 'default' : 'outline'}
              className={cn('rounded-full')}
              onClick={() => setNiche(NICHE_ALL)}
            >
              All
            </Button>
            {niches.map((n) => (
              <Button
                key={n.code}
                type="button"
                size="sm"
                variant={selectedNiche === n.code ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setNiche(n.code)}
              >
                {n.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {listError && (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      )}
      {loading ? (
        hasSession ? (
          <TemplatesGridSkeleton variant="page" count={Math.min(pageSize, 12)} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )
      ) : hasSession && items.length === 0 && total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20"
              aria-hidden
            >
              <LayoutTemplate className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div className="space-y-3">
              {selectedNiche !== NICHE_ALL ? (
                <>
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    No templates in {nicheLabel(selectedNiche)}
                  </p>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                    Try another niche or{' '}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => setNiche(NICHE_ALL)}
                    >
                      show all
                    </button>
                    .
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold tracking-tight text-foreground">No templates yet</p>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                    Your template library is empty. Add your first template to reuse layouts and style direction
                    across future generations.
                  </p>
                  <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground/90">
                    For technical setup and API import options, see project documentation.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : hasSession ? (
        <div className="space-y-4">
          {items.length > 0 ? (
            <div
              className={cn(
                'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
                paginationBusy && 'pointer-events-none opacity-55 transition-opacity',
              )}
            >
              {items.map((t) => (
                <Card key={t.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    {t.preview_url ? (
                      <Image
                        src={t.preview_url}
                        alt={`Template preview: ${t.name}`}
                        fill
                        sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No preview
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {t.niche ? (
                          <Badge variant="glass" className="text-[10px]">
                            {nicheLabel(t.niche)}
                          </Badge>
                        ) : null}
                        <Badge variant="default" className="text-[10px]">
                          {t.user_id ? 'Yours' : 'System'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">slug: {t.slug}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : total > 0 ? (
            <p className="text-sm text-muted-foreground">No templates on this page.</p>
          ) : null}
          {total > 0 ? (
            <TemplatesPagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={setPage}
              pageSizeOptions={TEMPLATE_PAGE_SIZE_OPTIONS}
              onPageSizeChange={setLimit}
              isNavBusy={paginationBusy}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
