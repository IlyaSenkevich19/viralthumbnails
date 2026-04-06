import { Suspense } from 'react';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { TemplatesClient } from './templates-client';

export default function TemplatesPage() {
  return (
    <>
      <SetPageFrame title="Templates" />
      <Suspense fallback={null}>
        <TemplatesClient />
      </Suspense>
    </>
  );
}
