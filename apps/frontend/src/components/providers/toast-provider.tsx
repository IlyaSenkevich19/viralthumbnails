'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'vt-toast',
        },
      }}
    />
  );
}

