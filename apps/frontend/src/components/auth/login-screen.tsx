'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignInMutation, useSignInWithGoogleMutation } from '@/lib/hooks';
import { toast } from 'sonner';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppRoutes } from '@/config/routes';
import { AuthSplitLayout, authFormInputClassName } from '@/components/auth/auth-split-layout';

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
          router.push(AppRoutes.welcomeTrial);
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
    <AuthSplitLayout
      headerRight={
        <>
          No account?{' '}
          <Link href={AppRoutes.auth.register} className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome <span className="text-primary">back</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to keep generating and iterating thumbnail variants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="surface relative space-y-4 overflow-hidden p-6">
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
            className={authFormInputClassName}
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
            className={authFormInputClassName}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading || googleLoading}>
          {loading ? 'Signing in...' : 'Sign in →'}
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} disabled={loading} />
    </AuthSplitLayout>
  );
}
