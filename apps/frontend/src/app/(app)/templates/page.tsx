import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { TemplatesClient } from './templates-client';

export default function TemplatesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TemplatesClient />
    </Suspense>
  );
}
