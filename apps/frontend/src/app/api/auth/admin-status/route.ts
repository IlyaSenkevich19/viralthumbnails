import { NextResponse } from 'next/server';
import { userIdIsAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    isAdmin: userIdIsAdmin(user?.id),
  });
}
