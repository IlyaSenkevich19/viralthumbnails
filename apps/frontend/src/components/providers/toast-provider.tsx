'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'backdrop-blur-xl bg-glass border border-border shadow-premium',
        },
      }}
    />
  );
}

