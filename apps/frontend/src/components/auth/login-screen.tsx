'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BrandWordmark } from '@/components/layout/brand-wordmark';
import { useSignInMutation, useSignInWithGoogleMutation } from '@/lib/hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppRoutes } from '@/config/routes';
import { AuthThumbnailMarquee } from '@/components/auth/auth-thumbnail-marquee';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const signIn = useSignInMutation();
  const googleSignIn = useSignInWithGoogleMutation();

  const loading = signIn.isPending;
  const googleLoading = googleSignIn.isPending;
  const inputClassName =
    'h-auto rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/20';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success('Welcome back!');
          router.push(AppRoutes.create);
          router.refresh();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
          setError(message);
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
      },
    });
  }

  return (
    <div className="flex min-h-screen items-stretch bg-background">
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16">
        <header className="mb-10 flex items-center justify-between">
          <BrandWordmark className="text-base" />
          <div className="text-sm text-muted-foreground">
            No account?{' '}
            <Link href={AppRoutes.auth.register} className="font-medium text-foreground hover:underline">
              Sign up
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome <span className="text-primary">back</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to keep generating and iterating thumbnail variants.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="surface relative overflow-hidden space-y-4 p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                  Your email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    href={AppRoutes.auth.forgotPassword}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClassName}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading ? 'Signing in...' : 'Sign in →'}
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
        <div className="relative z-[2] w-full space-y-12 px-10">
          <div className="mx-auto max-w-xl space-y-6">
            <h2 className="text-3xl font-semibold leading-tight">
              Analyze video.
              <br />
              Generate and iterate fast.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              One flow for prompt, URL, and upload. Pipeline models do the heavy lifting while you focus on CTR.
            </p>
          </div>
          <AuthThumbnailMarquee />
        </div>
      </div>
    </div>
  );
}
