import { Suspense } from 'react';
import { NewProjectForm } from './new-project-form';

function FormFallback() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <NewProjectForm />
    </Suspense>
  );
}
