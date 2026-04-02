'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNewProject } from '@/contexts/new-project-context';
import { NewProjectForm } from '@/components/new-project/new-project-form';
import { Button } from '@/components/ui/button';

export function NewProjectModal() {
  const { open, params, formSession, closeNewProject } = useNewProject();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNewProject();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, closeNewProject]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('#project-title')?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, formSession]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm sm:items-center sm:py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeNewProject();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-modal-title"
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-premium motion-base"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 pt-0.5">
            <h2
              id="new-project-modal-title"
              className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              New project
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the tabs for <span className="text-foreground/90">video</span>,{' '}
              <span className="text-foreground/90">script</span>, or extra options. To only describe an idea or paste a
              YouTube link, close this and use the <span className="text-foreground/90">Dashboard</span> — it creates
              and generates in one step.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={closeNewProject}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[min(70vh,calc(100vh-8rem))] overflow-y-auto px-5 pb-6 pt-4 sm:px-6">
          <NewProjectForm
            key={formSession}
            initialQuery={params}
            onRequestClose={closeNewProject}
          />
        </div>
      </div>
    </div>
  );
}
