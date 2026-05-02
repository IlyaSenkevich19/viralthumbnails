'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Above paywall/dialog layers (see insufficient-credits z-[250]); below nothing critical. */
const TOOLTIP_Z = 340;

export type InfoHintProps = {
  children?: ReactNode;
  /**
   * Tooltip body with default muted typography (use either this or `children`, not both —
   * when both are set, `helpBody` wins).
   */
  helpBody?: ReactNode;
  /** Short name for the help button (e.g. “Keyboard shortcuts”). */
  buttonLabel?: string;
  /**
   * Long text for screen readers when other controls use `aria-describedby={anchorId}`.
   * Renders a visually hidden element with that id.
   */
  srSummary?: string;
  /** Must be set together with `srSummary` for `aria-describedby` wiring. */
  anchorId?: string;
  className?: string;
  /** Tooltip panel position */
  side?: 'top' | 'bottom';
};

/**
 * Compact help control: icon only by default; full explanation on hover / keyboard focus.
 * Tooltip is portaled with fixed positioning so it is not clipped by card shells (`overflow-hidden`).
 */
export function InfoHint({
  children,
  helpBody,
  buttonLabel = 'More information',
  srSummary,
  anchorId,
  className,
  side = 'bottom',
}: InfoHintProps) {
  const hasAnchor = Boolean(anchorId && srSummary);
  const tooltipId = useId();
  const tooltipContent =
    helpBody !== undefined ? (
      <div className="text-[11px] leading-relaxed text-muted-foreground">{helpBody}</div>
    ) : (
      children
    );

  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const syncCoords = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 8;
    setCoords({
      top: side === 'bottom' ? r.bottom + gap : r.top - gap,
      left: r.left + r.width / 2,
    });
  }, [side]);

  const openNow = useCallback(() => {
    cancelClose();
    syncCoords();
    setOpen(true);
  }, [cancelClose, syncCoords]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    return () => cancelClose();
  }, [cancelClose]);

  useLayoutEffect(() => {
    if (!open) return;
    syncCoords();
    const onReflow = () => syncCoords();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, syncCoords]);

  const panelTransform = side === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)';
  const panelStyle: CSSProperties = {
    position: 'fixed',
    top: coords.top,
    left: coords.left,
    transform: panelTransform,
    zIndex: TOOLTIP_Z,
  };

  const portal =
    mounted &&
    typeof document !== 'undefined' &&
    open &&
    createPortal(
      <div
        id={tooltipId}
        role="tooltip"
        style={panelStyle}
        className="pointer-events-auto w-max min-w-[10rem] max-w-[min(20rem,calc(100vw-2rem))] opacity-100 transition-opacity duration-100 motion-reduce:transition-none"
        onPointerEnter={openNow}
        onPointerLeave={scheduleClose}
      >
        <div
          className={cn(
            'rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left text-xs leading-relaxed text-foreground shadow-lg',
          )}
        >
          {tooltipContent}
        </div>
      </div>,
      document.body,
    );

  return (
    <span className={cn('relative inline-flex items-center gap-0', className)}>
      {hasAnchor ? (
        <span id={anchorId} className="sr-only">
          {srSummary}
        </span>
      ) : null}
      <button
        ref={btnRef}
        type="button"
        className={cn(
          'group/hint relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          'text-muted-foreground transition-colors',
          'hover:bg-muted/80 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        aria-label={buttonLabel}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={openNow}
        onPointerLeave={scheduleClose}
        onFocus={openNow}
        onBlur={scheduleClose}
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
      {portal}
    </span>
  );
}
