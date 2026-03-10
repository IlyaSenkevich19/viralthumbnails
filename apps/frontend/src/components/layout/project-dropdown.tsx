'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useProject } from '@/contexts/project-context';
import { useProjects } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';

export function ProjectDropdown() {
  const { projectId, setProjectId } = useProject();
  const { data: projects = [], isLoading } = useProjects();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (projectId === null && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId, setProjectId]);

  const currentProject = projects.find((p) => p.id === projectId);

  if (isLoading || projects.length === 0) {
    return (
      <Link
        href="/new-project/website"
        className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
      >
        <Plus className="h-4 w-4" />
        New project
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
          'border-border bg-background hover:bg-muted/50',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select project"
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[160px] truncate">
          {currentProject?.name ?? 'Select project'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-border bg-background py-1 shadow-lg"
          role="listbox"
        >
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === projectId}
              onClick={() => {
                setProjectId(p.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                p.id === projectId
                  ? 'bg-orange-50 font-medium text-orange-800'
                  : 'hover:bg-muted/50',
              )}
            >
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <Link
            href="/new-project/website"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50"
            onClick={() => setOpen(false)}
          >
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </div>
      )}
    </div>
  );
}
