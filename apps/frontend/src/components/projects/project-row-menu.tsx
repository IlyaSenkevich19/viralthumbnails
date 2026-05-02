'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRight, MoreVertical, Trash2 } from 'lucide-react';
import { projectVariantsPath } from '@/config/routes';
import { Button } from '@/components/ui/button';

const MENU_MIN_WIDTH = 160;

type ProjectRowMenuProps = {
  projectId: string;
  projectTitle: string;
  onDeleteClick: () => void;
};

export function ProjectRowMenu({ projectId, projectTitle, onDeleteClick }: ProjectRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    let left = r.right - MENU_MIN_WIDTH;
    const margin = 8;
    if (left < margin) left = margin;
    if (left + MENU_MIN_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - MENU_MIN_WIDTH - margin);
    }
    setPos({ top: r.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const menu =
    open && mounted ? (
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          minWidth: MENU_MIN_WIDTH,
          zIndex: 200,
        }}
        className="overflow-hidden rounded-xl border border-border bg-card py-1 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)]"
      >
        <Link
          href={projectVariantsPath(projectId)}
          role="menuitem"
          className="motion-base flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          Open
        </Link>
        <button
          type="button"
          role="menuitem"
          className="motion-base flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onDeleteClick();
          }}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          Delete project…
        </button>
      </div>
    ) : null;

  return (
    <div className="relative flex justify-end">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${projectTitle}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </Button>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
