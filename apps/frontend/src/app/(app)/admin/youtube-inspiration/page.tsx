import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { userIdIsAdmin } from '@/lib/admin';
import { AppRoutes } from '@/config/routes';
import { createClient } from '@/lib/supabase/server';
import { YoutubeInspirationAdminClient } from './youtube-inspiration-admin-client';

export default async function AdminYoutubeInspirationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !userIdIsAdmin(user.id)) {
    redirect(AppRoutes.dashboard);
  }

  return (
    <Suspense fallback={null}>
      <YoutubeInspirationAdminClient />
    </Suspense>
  );
}
