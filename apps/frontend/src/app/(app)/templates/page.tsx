import { Suspense } from 'react';
import { TemplatesClient } from './templates-client';

export default function TemplatesPage() {
  return (
    <Suspense fallback={null}>
      <TemplatesClient />
    </Suspense>
  );
}
