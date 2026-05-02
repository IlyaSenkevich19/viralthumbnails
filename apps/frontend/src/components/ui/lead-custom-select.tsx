'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeadCustomSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
};

export function LeadCustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
}: LeadCustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    if (!open) return;
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'motion-base flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:outline-none active:scale-[0.995]',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
          open
            ? 'border-border-hover ring-1 ring-ring/45'
            : 'border-border hover:border-[color:var(--border-hover)]',
        )}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value || placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-black/40">
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map((option) => {
              const selected = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>{option}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

