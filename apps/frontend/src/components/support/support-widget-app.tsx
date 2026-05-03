'use client';

import { useAuth } from '@/contexts/auth-context';
import { SupportWidget } from '@/components/support/support-widget';

/** App shell: same-origin `/api/support/contact` + email from session when available. */
export function SupportWidgetApp() {
  const { user } = useAuth();
  return <SupportWidget source="app" defaultEmail={user?.email ?? ''} />;
}
