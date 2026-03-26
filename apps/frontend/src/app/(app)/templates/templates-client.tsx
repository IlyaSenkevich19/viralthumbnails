'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NICHE_ALL, useTemplateNiches, useTemplatesList } from '@/lib/hooks';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NICHE_QUERY = 'niche';

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

  const setNiche = useCallback(
    (next: string | typeof NICHE_ALL) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === NICHE_ALL) {
        params.delete(NICHE_QUERY);
      } else {
        params.set(NICHE_QUERY, next);
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
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [niches, pathname, rawNiche, router, searchParams]);

  const { data: items = [], isPending, isError, error } = useTemplatesList(selectedNiche);

  const loading = authLoading || (hasSession && isPending);
  const listError =
    !authLoading && !hasSession
      ? 'Not signed in'
      : isError
        ? (error as Error).message
        : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">
          In Storage you can use root folders per niche:{' '}
          <code className="rounded bg-secondary px-1 text-xs">cooking/…</code>,{' '}
          <code className="rounded bg-secondary px-1 text-xs">vlog/…</code>, etc. (folder name = niche code). Alternatively{' '}
          <code className="rounded bg-secondary px-1 text-xs">system/&lt;niche&gt;/…</code> or set{' '}
          <code className="rounded bg-secondary px-1 text-xs">niche</code> on the DB row. API uploads with{' '}
          <code className="rounded bg-secondary px-1 text-xs">niche</code> use{' '}
          <code className="rounded bg-secondary px-1 text-xs">{`{user_id}/{niche}/{slug}.png`}</code>.
        </p>
      </div>

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
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : hasSession && items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {selectedNiche !== NICHE_ALL ? (
              <>
                No templates in <strong className="text-foreground">{nicheLabel(selectedNiche)}</strong>. Try
                another niche or <button type="button" className="text-primary underline" onClick={() => setNiche(NICHE_ALL)}>show all</button>.
              </>
            ) : (
              <>
                No templates found. Upload images in the Dashboard (bucket root,{' '}
                <code className="rounded bg-secondary px-1 text-xs">system/</code>, or your user folder) or create via{' '}
                <code className="rounded bg-secondary px-1 text-xs">POST /api/templates</code>.
              </>
            )}
          </CardContent>
        </Card>
      ) : hasSession && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {t.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.preview_url} alt="" className="h-full w-full object-cover" />
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
      ) : null}
    </div>
  );
}
