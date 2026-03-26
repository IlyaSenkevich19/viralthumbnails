'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type NewProjectParams = Record<string, string>;

interface NewProjectContextValue {
  open: boolean;
  params: NewProjectParams;
  formSession: number;
  openNewProject: (params?: NewProjectParams) => void;
  closeNewProject: () => void;
}

const NewProjectContext = createContext<NewProjectContextValue | null>(null);

export function NewProjectProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<NewProjectParams>({});
  const [formSession, setFormSession] = useState(0);

  const openNewProject = useCallback((next: NewProjectParams = {}) => {
    setParams(next);
    setFormSession((s) => s + 1);
    setOpen(true);
  }, []);

  const closeNewProject = useCallback(() => {
    setOpen(false);
    setParams({});
  }, []);

  const value = useMemo(
    () => ({
      open,
      params,
      formSession,
      openNewProject,
      closeNewProject,
    }),
    [open, params, formSession, openNewProject, closeNewProject],
  );

  return <NewProjectContext.Provider value={value}>{children}</NewProjectContext.Provider>;
}

export function useNewProject() {
  const ctx = useContext(NewProjectContext);
  if (!ctx) {
    throw new Error('useNewProject must be used within NewProjectProvider');
  }
  return ctx;
}
