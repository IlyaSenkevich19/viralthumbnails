'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PageFrameState = {
  title: string | null;
  eyebrow: string | null;
};

const defaultFrame: PageFrameState = {
  title: null,
  eyebrow: null,
};

type PageFrameContextValue = {
  frame: PageFrameState;
  setFrame: (next: PageFrameState) => void;
  clearFrame: () => void;
};

const PageFrameContext = createContext<PageFrameContextValue | null>(null);

export function PageFrameProvider({ children }: { children: ReactNode }) {
  const [frame, setFrameState] = useState<PageFrameState>(defaultFrame);

  const setFrame = useCallback((next: PageFrameState) => {
    setFrameState(next);
  }, []);

  const clearFrame = useCallback(() => {
    setFrameState(defaultFrame);
  }, []);

  const value = useMemo(
    () => ({ frame, setFrame, clearFrame }),
    [frame, setFrame, clearFrame],
  );

  return <PageFrameContext.Provider value={value}>{children}</PageFrameContext.Provider>;
}

export function usePageFrame(): PageFrameContextValue {
  const ctx = useContext(PageFrameContext);
  if (!ctx) {
    throw new Error('usePageFrame must be used within PageFrameProvider');
  }
  return ctx;
}
