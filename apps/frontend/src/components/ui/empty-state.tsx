import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  /** Decorative icon wrapper (typically `rounded-2xl bg-primary/15 …`). */
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** Shared empty / zero-data pattern across list pages (avatars, templates, projects, etc.). */
export function EmptyState({ title, description, icon, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-14',
        className,
      )}
    >
      {icon ? (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 [&_svg]:shrink-0">
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-base font-semibold tracking-tight text-foreground">{title}</p>
        {description ? (
          <div className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
