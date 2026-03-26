import { Suspense } from 'react';
import { TemplatesClient } from './templates-client';

export default function TemplatesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <TemplatesClient />
    </Suspense>
  );
}
