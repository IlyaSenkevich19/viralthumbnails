'use client';

import { useLayoutEffect } from 'react';
import { usePageFrame, type PageBreadcrumbSegment } from '@/contexts/page-frame-context';

export type SetPageFrameProps = {
  title: string;
  /** Small label above the title (e.g. “Admin”) */
  eyebrow?: string | null;
  /** e.g. `[{ label: 'Projects', href: '...' }, { label: 'My project' }]` — last segment is current */
  breadcrumb?: PageBreadcrumbSegment[] | null;
};

/**
 * Registers page title (and optional eyebrow / breadcrumb) for {@link HeaderShell}.
 * Clears on unmount (e.g. route change).
 */
export function SetPageFrame({ title, eyebrow = null, breadcrumb = null }: SetPageFrameProps) {
  const { setFrame, clearFrame } = usePageFrame();

  useLayoutEffect(() => {
    setFrame({ title, eyebrow: eyebrow ?? null, breadcrumb: breadcrumb ?? null });
    return () => clearFrame();
  }, [title, eyebrow, breadcrumb, setFrame, clearFrame]);

  return null;
}
