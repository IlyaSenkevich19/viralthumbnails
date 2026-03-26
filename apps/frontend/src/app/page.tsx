'use client';

import Link from 'next/link';
import { siteName } from '@/config/site';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { SectionWrapper } from '@/components/ui/section-wrapper';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <SectionWrapper className="flex min-h-screen items-center">
      <div className="mx-auto max-w-3xl text-center">
        <div className="surface space-y-8 p-8 md:p-12">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            {siteName} <span className="text-primary">template</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Next.js + Supabase Auth + NestJS API in a Turborepo monorepo. Add your domain on top.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
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
    </SectionWrapper>
  );
}
