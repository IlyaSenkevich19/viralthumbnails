'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InfoHint } from '@/components/ui/info-hint';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { vtSpring } from '@/lib/motion-presets';

export type ConfirmationGuardConfig = {
  /** Matched against user input after trim and case folding (usually `DELETE`). */
  phrase: string;
  /** Visible label above the confirmation field */
  fieldLabel: string;
  hint?: ReactNode;
  /** Accessible label for the help icon (details live in {@link ConfirmationGuardConfig.hint}). */
  hintAriaLabel?: string;
  placeholder?: string;
};

function phrasesMatch(rawInput: string, phrase: string): boolean {
  return rawInput.trim().toLowerCase() === phrase.trim().toLowerCase();
}

/** Canonical token for guarded destructive confirmations (comparison is case-insensitive). */
export const DESTRUCTIVE_CONFIRM_WORD = 'DELETE' as const;

export type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive uses danger styling on the confirm action. */
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  /** When set, Confirm stays disabled until the user types {@link ConfirmationGuardConfig.phrase}. */
  confirmGuard?: ConfirmationGuardConfig;
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
  confirmGuard,
}: ConfirmationModalProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const guardFieldId = useId();
  const [guardValue, setGuardValue] = useState('');
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (open) setGuardValue('');
  }, [open]);

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
  const confirmDisabled =
    !!confirmGuard && !phrasesMatch(guardValue, confirmGuard.phrase);
  const describedBy = [description ? descId : null].filter(Boolean).join(' ');

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
        aria-describedby={describedBy || undefined}
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
          <div id={descId} className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
        {confirmGuard ? (
          <div className="mt-5 space-y-2">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <label htmlFor={guardFieldId} className="min-w-0 text-sm font-medium leading-snug text-foreground">
                {confirmGuard.fieldLabel}
              </label>
              {confirmGuard.hint ? (
                <InfoHint
                  className="shrink-0"
                  buttonLabel={confirmGuard.hintAriaLabel ?? 'Why we ask you to confirm by typing'}
                >
                  <div className="text-[11px] leading-snug text-muted-foreground">{confirmGuard.hint}</div>
                </InfoHint>
              ) : null}
            </div>
            <Input
              id={guardFieldId}
              type="text"
              value={guardValue}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={
                confirmGuard &&
                guardValue.length > 0 &&
                !phrasesMatch(guardValue, confirmGuard.phrase)
                  ? true
                  : undefined
              }
              placeholder={confirmGuard.placeholder ?? confirmGuard.phrase}
              onChange={(e) => setGuardValue(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={confirmDisabled}
            onClick={() => {
              if (confirmGuard && !phrasesMatch(guardValue, confirmGuard.phrase)) return;
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
