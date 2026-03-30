'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type CollapsedSidebarTooltipProps = {
  label: string;
  /** When false, children render without a tooltip wrapper. */
  enabled: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Fixed-position tooltip for collapsed sidebar items so labels are not clipped by overflow-x-hidden.
 */
export function CollapsedSidebarTooltip({
  label,
  enabled,
  children,
  className,
}: CollapsedSidebarTooltipProps) {
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 10 });
  };

  useEffect(() => {
    if (!visible) return;
    updatePos();
    const onReposition = () => updatePos();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [visible]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={anchorRef}
        className={cn('inline-flex', className)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocusCapture={() => setVisible(true)}
        onBlurCapture={() => setVisible(false)}
      >
        {children}
      </div>
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] max-w-[14rem] -translate-y-1/2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-soft"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
