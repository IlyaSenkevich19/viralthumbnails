'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
import { vtSpring } from '@/lib/motion-presets';

export function LoginScreen() {
  const reduceMotion = useReducedMotion();
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-foreground">
            Welcome <span className="text-primary">back</span>
          </h1>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="surface relative space-y-4 overflow-hidden p-6"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-col gap-2">
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-auth-error' : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-auth-error' : undefined}
          />
        </div>
        {error ? (
          <p id="login-auth-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading || googleLoading}>
          {loading ? 'Signing in…' : 'Sign in →'}
        </Button>
      </motion.form>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} disabled={loading} />
    </AuthSplitLayout>
  );
}
