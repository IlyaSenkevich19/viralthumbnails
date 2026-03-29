'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { siteName } from '@/config/site';
import { useSignInMutation, useSignInWithGoogleMutation } from '@/lib/hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const signIn = useSignInMutation();
  const googleSignIn = useSignInWithGoogleMutation();

  const loading = signIn.isPending;
  const googleLoading = googleSignIn.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success('Welcome back!');
          router.push('/dashboard');
          router.refresh();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
          setError(message);
          toast.error(message);
        },
      },
    );
  }

  function handleGoogle() {
    setError('');
    googleSignIn.mutate(undefined, {
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to sign in with Google.';
        setError(message);
        toast.error(message);
      },
    });
  }

  return (
    <div className="flex min-h-screen items-stretch bg-background">
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary shadow-md shadow-primary/25" />
            <span className="font-semibold tracking-tight text-foreground">{siteName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/auth/register" className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Sign in to <span className="text-primary">your account</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the email and password you registered with.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="surface space-y-4 p-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Your email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading ? 'Signing in...' : 'Login →'}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="flex h-11 w-full items-center justify-center gap-2"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
                <Image
                  src="/google-logo.svg"
                  alt="Google"
                  width={16}
                  height={16}
                  priority
                />
              </span>
              <span className="text-sm font-medium text-foreground">
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </span>
            </Button>
          </div>
        </main>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-border bg-card text-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,59,59,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.04),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_60%,_rgba(0,0,0,0.15))]" />
        <div className="relative max-w-xl space-y-6 px-10">
          <h2 className="text-3xl font-semibold leading-tight">
            Ship faster
            <br />
            on a clean stack.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Next.js, Supabase Auth, and NestJS in one monorepo — add your product logic on top.
          </p>
        </div>
      </div>
    </div>
  );
}
