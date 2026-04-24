'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppRoutes } from '@/config/routes';
import { Button } from '@/components/ui/button';

export const OPEN_PAYWALL_EVENT = 'vt-open-insufficient-credits-paywall';

type InsufficientCreditsPayload = {
  title: string;
  description: string;
  need?: number;
  have?: number;
};

export function openInsufficientCreditsPaywall(payload: InsufficientCreditsPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<InsufficientCreditsPayload>(OPEN_PAYWALL_EVENT, { detail: payload }));
}

export function InsufficientCreditsPaywall() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<InsufficientCreditsPayload | null>(null);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const custom = e as CustomEvent<InsufficientCreditsPayload>;
      if (!custom.detail) return;
      setPayload(custom.detail);
      setOpen(true);
    };
    window.addEventListener(OPEN_PAYWALL_EVENT, onEvent as EventListener);
    return () => window.removeEventListener(OPEN_PAYWALL_EVENT, onEvent as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !payload) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm sm:py-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="credits-paywall-title"
        aria-describedby="credits-paywall-desc"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-premium"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="credits-paywall-title" className="text-lg font-semibold tracking-tight text-foreground">
          {payload.title}
        </h2>
        <p id="credits-paywall-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {payload.description}
        </p>
        {typeof payload.need === 'number' && typeof payload.have === 'number' ? (
          <p className="mt-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground/90">
            Need <strong>{payload.need}</strong> credit{payload.need === 1 ? '' : 's'}, you have{' '}
            <strong>{payload.have}</strong>.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Continue editing
          </Button>
          <Button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(AppRoutes.credits);
            }}
          >
            Unlock credits
          </Button>
        </div>
      </div>
    </div>
  );
}

