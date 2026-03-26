'use client';

import Link from 'next/link';
import { siteName } from '@/config/site';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          {siteName}{' '}
          <span className="text-primary">template</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Next.js + Supabase Auth + NestJS API in a Turborepo monorepo. Add your domain on top.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          {!isLoading && (
            <>
              {!user ? (
                <>
                  <Link href="/auth/login">
                    <Button size="lg">Sign in</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="outline" size="lg">
                      Sign up
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard">
                  <Button size="lg">Dashboard</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
