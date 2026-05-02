'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VtPillToggleRow } from '@/components/motion/vt-pill-toggle-row';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';
import { TemplatesPagination } from '@/components/templates/templates-pagination';
import { EmptyState, EmptyStateCard } from '@/components/ui/empty-state';
import { InfoHint } from '@/components/ui/info-hint';
import { InlineLoadError } from '@/components/ui/inline-load-error';
import { vtSpring, vtStagger } from '@/lib/motion-presets';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';
import { buttonVariants } from '@/components/ui/button';

const NICHE_QUERY = 'niche';
const PAGE_QUERY = 'page';
const LIMIT_QUERY = 'limit';

export function TemplatesClient() {
  const reduceMotion = useReducedMotion();
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
    refetch,
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
  const sessionGate = !authLoading && !hasSession;
  const fetchErrorMessage = authLoading || !hasSession ? null : isError ? (error as Error).message : null;

  const nichePillItems = useMemo(
    () => [{ id: NICHE_ALL, label: 'Any niche' }, ...niches.map((n) => ({ id: n.code, label: n.label }))],
    [niches],
  );

  const templateCardItemVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0, scale: 1 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 14, scale: 0.99 },
        visible: { opacity: 1, y: 0, scale: 1, transition: vtSpring.reveal },
      };

  return (
    <div className="space-y-6">
      {hasSession && niches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Niche</span>
          <VtPillToggleRow
            className="min-w-0 flex-1"
            layoutId="vt-templates-niche-pill"
            items={nichePillItems}
            selectedId={selectedNiche}
            onSelect={(id) => setNiche(id)}
          />
        </div>
      ) : null}

      {sessionGate ? (
        <InlineLoadError
          tone="neutral"
          message="Sign in to browse templates and reuse them across generations."
          extraActions={
            <Link href={AppRoutes.home} className={buttonVariants({ variant: 'default', size: 'sm' })}>
              Sign in
            </Link>
          }
        />
      ) : fetchErrorMessage ? (
        <InlineLoadError message={fetchErrorMessage} onRetry={() => void refetch()} />
      ) : null}
      {loading ? (
        <TemplatesGridSkeleton variant="page" count={Math.min(pageSize, 12)} />
      ) : hasSession && items.length === 0 && total === 0 ? (
        <EmptyStateCard
          icon={<LayoutTemplate className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
          title={
            selectedNiche !== NICHE_ALL ? `No templates in ${nicheLabel(selectedNiche)}` : 'No templates yet'
          }
          description={
            selectedNiche !== NICHE_ALL ? (
              <>
                Try another niche or{' '}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setNiche(NICHE_ALL)}
                >
                  show every niche
                </button>
                .
              </>
            ) : (
              <>
                Your template library is empty—add presets to steer layout and typography on future renders.{' '}
                <span className="inline-flex translate-y-[2px] align-middle">
                  <InfoHint
                    buttonLabel="Template library setup paths"
                    helpBody={
                      <p>For bulk imports, scripted migrations, or API-driven seeds, skim the docs shipped with this repo.</p>
                    }
                  />
                </span>
              </>
            )
          }
        />
      ) : hasSession ? (
        <div className="space-y-4">
          {items.length > 0 ? (
            <motion.div
              key={`${selectedNiche}-${page}-${limit}`}
              className={cn(
                'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
                paginationBusy && 'pointer-events-none opacity-55 transition-opacity',
              )}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: reduceMotion ? 0 : vtStagger.card,
                    delayChildren: reduceMotion ? 0 : 0.02,
                  },
                },
              }}
            >
              {items.map((t) => (
                <motion.div key={t.id} variants={templateCardItemVariants} className="min-w-0">
                  <Card className="overflow-hidden">
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
                </motion.div>
              ))}
            </motion.div>
          ) : total > 0 ? (
            <EmptyState
              density="compact"
              icon={<LayoutTemplate className="h-6 w-6" strokeWidth={1.75} aria-hidden />}
              title="Nothing on this page"
              description="Try another page or change how many items you show per page."
            />
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
