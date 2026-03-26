'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type State = 'loading' | 'ok' | 'error';

export function BackendHealth() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => {
        if (!cancelled) setState(res.ok ? 'ok' : 'error');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <Badge className="border-slate-200 bg-slate-50 text-slate-600">API: …</Badge>;
  }
  if (state === 'ok') {
    return (
      <Badge
        className={cn(
          'border-emerald-500/30 bg-emerald-600 text-white shadow-sm',
          'hover:bg-emerald-600',
        )}
      >
        API: OK
      </Badge>
    );
  }
  return (
    <Badge className="border-red-200 bg-red-600 text-white hover:bg-red-600">API: unreachable</Badge>
  );
}
