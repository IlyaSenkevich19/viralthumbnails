'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Reddit <span className="text-primary">LeadGen</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered Reddit lead generation. Monitor keywords, score buying intent,
          and draft natural replies—all in one dashboard.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          {!isLoading && (
            <>
              {!user ? (
                <>
                  <Link href="/auth/login">
                    <Button size="lg">Sign In</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="outline" size="lg">Sign Up</Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
