'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyStateCard } from '@/components/ui/empty-state';
import { InfoHint } from '@/components/ui/info-hint';
import { QA_STORAGE_KEY, QA_TEST_GROUPS, type QATestCase } from '@/lib/qa/qa-test-cases';
import { cn } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';

function loadChecks(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(QA_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function allCaseIds(): string[] {
  return QA_TEST_GROUPS.flatMap((g) => g.items.map((i) => i.id));
}

export function QAChecklistClient() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecks(loadChecks());
  }, []);

  const persist = useCallback((next: Record<string, boolean>) => {
    setChecks(next);
    try {
      localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      persist({ ...checks, [id]: !checks[id] });
    },
    [checks, persist],
  );

  const doneCount = useMemo(() => allCaseIds().filter((id) => checks[id]).length, [checks]);
  const total = allCaseIds().length;

  const reset = useCallback(() => {
    persist({});
  }, [persist]);

  const markAllDone = useCallback(() => {
    const next: Record<string, boolean> = {};
    allCaseIds().forEach((id) => {
      next[id] = true;
    });
    persist(next);
  }, [persist]);

  return (
    <>
      <SetPageFrame title="QA checklist" />
      <div className="mx-auto max-w-3xl space-y-6 px-1 pb-16">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <h2 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground">Manual QA checklist</h2>
            <InfoHint
              className="shrink-0"
              buttonLabel="How this checklist stores progress"
              helpBody={
                <p>
                  Development-only tooling. Checkbox state persists in{' '}
                  <code className="rounded bg-secondary px-1 text-[11px]">localStorage</code> for this browser. Pair it
                  with{' '}
                  <code className="rounded bg-secondary px-1 text-[11px]">docs/qa-manual-test-checklist.md</code> for scripted
                  cases.
                </p>
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Progress:{' '}
            <span className="font-medium text-foreground">
              {doneCount}/{total}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              Clear all checks
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={markAllDone}>
              Mark all done
            </Button>
          </div>
        </div>

        {doneCount === 0 ? (
          <EmptyStateCard
            cardClassName="rounded-xl border border-border/70 bg-muted/15"
            className="py-10 sm:py-12"
            icon={<ClipboardList className="h-7 w-7" strokeWidth={1.75} aria-hidden />}
            title="No checks recorded yet"
            description="Work through the groups below and mark items as you verify them. Progress is saved in this browser only (localStorage)."
          />
        ) : null}

        {QA_TEST_GROUPS.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((item: QATestCase) => {
                const checked = Boolean(checks[item.id]);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/50',
                      checked && 'bg-muted/30',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                    />
                    <span className="min-w-0 text-sm leading-relaxed text-foreground">
                      {item.label}
                      {item.hint ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground">
          Remove this route before production hardening, or keep gated by NODE_ENV (page returns 404 in
          production builds).
        </p>
      </div>
    </>
  );
}
