import { Suspense } from 'react';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { TemplatesClient } from './templates-client';
import { TemplatesGridSkeleton } from '@/components/templates/templates-grid-skeleton';

export default function TemplatesPage() {
  return (
    <>
      <SetPageFrame title="Templates" />
      <Suspense fallback={<TemplatesGridSkeleton variant="page" count={12} />}>
        <TemplatesClient />
      </Suspense>
    </>
  );
}
