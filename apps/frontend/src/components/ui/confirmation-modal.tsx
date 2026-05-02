'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { vtSpring } from '@/lib/motion-presets';

export type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive uses danger styling on the confirm action. */
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
};

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmationModalProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const titleId = 'confirmation-modal-title';
  const descId = 'confirmation-modal-desc';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm sm:py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <motion.div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative w-full max-w-md rounded-2xl border border-border bg-card p-6 motion-base',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),var(--shadow-elevated)]',
        )}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.965 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : vtSpring.enter}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
