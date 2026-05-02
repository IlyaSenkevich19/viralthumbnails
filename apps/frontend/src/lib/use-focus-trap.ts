'use client';

import { type RefObject, useEffect } from 'react';

const SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(SELECTOR)).filter(
    (el) => el.closest('[aria-hidden="true"]') === null,
  );
}

/**
 * Minimal focus trap for custom overlays (Radix-less modals).
 * Keeps Tab cycling inside `containerRef` while `active`.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;

    const focusables = getFocusables(root);
    const first = focusables[0];

    queueMicrotask(() => first?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const last = focusables[focusables.length - 1]!;
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        focusables[0]?.focus();
      } else if (e.shiftKey && document.activeElement === focusables[0]) {
        e.preventDefault();
        last.focus();
      }
    }

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [active, containerRef]);
}
