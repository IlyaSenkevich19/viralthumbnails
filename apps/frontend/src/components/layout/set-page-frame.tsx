'use client';

import { useLayoutEffect } from 'react';
import { usePageFrame } from '@/contexts/page-frame-context';

export type SetPageFrameProps = {
  title: string;
  /** Small label above the title (e.g. “Admin”) */
  eyebrow?: string | null;
};

/**
 * Registers page title (and optional eyebrow) for {@link HeaderShell}.
 * Clears on unmount (e.g. route change).
 */
export function SetPageFrame({ title, eyebrow = null }: SetPageFrameProps) {
  const { setFrame, clearFrame } = usePageFrame();

  useLayoutEffect(() => {
    setFrame({ title, eyebrow: eyebrow ?? null });
    return () => clearFrame();
  }, [title, eyebrow, setFrame, clearFrame]);

  return null;
}
