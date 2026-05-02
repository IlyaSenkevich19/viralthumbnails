'use client';

import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TemplatesPaginationProps = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Replaces default “No templates” when `total` is zero. */
  emptySummaryLabel?: string;
  /** When set with `onPageSizeChange`, shows a per-page selector. */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (limit: number) => void;
  /** Blocks page controls while the next slice is loading (e.g. with placeholder data). */
  isNavBusy?: boolean;
  className?: string;
};

export function TemplatesPagination({
  page,
  total,
  limit,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  isNavBusy = false,
  emptySummaryLabel,
  className,
}: TemplatesPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const to = Math.min(total, safePage * limit);
  const showSizeSelect = Boolean(pageSizeOptions?.length) && onPageSizeChange != null;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? (
            <>{emptySummaryLabel ?? 'No templates'}</>
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{from}</span>–
              <span className="font-medium text-foreground">{to}</span> of{' '}
              <span className="font-medium text-foreground">{total}</span>
            </>
          )}
        </p>
        {showSizeSelect && pageSizeOptions ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Per page</span>
            <select
              value={limit}
              disabled={isNavBusy}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 min-w-[4.5rem] rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Items per page"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2 sm:px-3"
          disabled={safePage <= 1 || isNavBusy}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2 sm:px-3"
          disabled={safePage <= 1 || isNavBusy}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <span className="min-w-[6rem] text-center text-sm text-muted-foreground tabular-nums sm:min-w-[7rem]">
          Page {safePage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2 sm:px-3"
          disabled={safePage >= totalPages || isNavBusy}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2 sm:px-3"
          disabled={safePage >= totalPages || isNavBusy}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
