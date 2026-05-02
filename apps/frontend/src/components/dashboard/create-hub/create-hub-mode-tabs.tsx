'use client';

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { dashboardCreateModes } from '../dashboard-create-hub.utils';
import type { HubMode } from '../dashboard-create-hub.utils';
import { vtSpring } from '@/lib/motion-presets';
import { cn } from '@/lib/utils';

type Props = {
  mode: HubMode;
  onModeChange: (id: HubMode) => void;
};

export const CreateHubModeTabs = memo(function CreateHubModeTabs({ mode, onModeChange }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="mt-6 flex flex-wrap gap-2"
      role="tablist"
      aria-label="How you provide context"
    >
      {dashboardCreateModes.map(({ id, label, icon: Icon }) => {
        const selected = mode === id;
        return (
          <motion.button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onModeChange(id)}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={vtSpring.tap}
            className={cn(
              'relative inline-flex items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-transparent text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-border-hover hover:text-foreground',
            )}
          >
            {selected ? (
              <motion.span
                layoutId="create-hub-mode-tab"
                className="absolute inset-0 bg-primary"
                transition={reduceMotion ? { duration: 0 } : vtSpring.layout}
              />
            ) : null}
            <Icon className="relative z-[1] h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="relative z-[1]">{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
});
