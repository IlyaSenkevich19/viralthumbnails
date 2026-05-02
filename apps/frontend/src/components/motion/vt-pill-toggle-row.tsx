'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { vtSpring } from '@/lib/motion-presets';
import { cn } from '@/lib/utils';

export type VtPillItem = { id: string; label: string };

type VtPillToggleRowProps = {
  items: VtPillItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Unique per row on the page so Framer can morph the active highlight. */
  layoutId: string;
  className?: string;
};

/**
 * Rounded filter toggles with shared layout cross-fade (design-taste motion baseline).
 */
export function VtPillToggleRow({ items, selectedId, onSelect, layoutId, className }: VtPillToggleRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map(({ id, label }) => {
        const selected = selectedId === id;
        return (
          <motion.button
            key={id}
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            transition={vtSpring.tap}
            onClick={() => onSelect(id)}
            className={cn(
              'relative inline-flex min-h-9 items-center justify-center overflow-hidden rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-transparent text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-primary"
                transition={reduceMotion ? { duration: 0 } : vtSpring.layout}
              />
            ) : null}
            <span className="relative z-[1]">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
