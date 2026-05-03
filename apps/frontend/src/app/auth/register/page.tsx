'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthSplitLayout, authFormInputClassName } from '@/components/auth/auth-split-layout';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppRoutes } from '@/config/routes';
import { trackEvent } from '@/lib/analytics';
import { useSignInWithGoogleMutation, useSignUpMutation } from '@/lib/hooks';
import { vtSpring } from '@/lib/motion-presets';

export default function RegisterPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const signUp = useSignUpMutation();
  const googleSignIn = useSignInWithGoogleMutation();

  useEffect(() => {
    trackEvent('signup_started', { source: 'register_page', flow: 'short' });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    signUp.mutate(
      { email, password },
      {
        onSuccess: () => {
          trackEvent('signup_completed', { source: 'register_page', method: 'email', flow: 'short' });
          setRegistered(true);
          toast.success('Confirm your email to activate account.');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to sign up. Please try again.';
          setError(message);
        },
      },
    );
  }

  function handleGoogle() {
    setError('');
    trackEvent('signup_started', { source: 'register_page', method: 'google', flow: 'short' });
    googleSignIn.mutate(undefined, {
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to sign up with Google.';
        setError(message);
      },
    });
  }

  const busy = signUp.isPending;
  const googleBusy = googleSignIn.isPending;

  return (
    <AuthSplitLayout
      headerRight={
        <>
          Already have an account?{' '}
          <Link href={AppRoutes.home} className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
        {!registered ? (
          <>
            <div>
              <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-foreground">
                Create your <span className="text-primary">account</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use Google or email. You&apos;ll answer a few quick questions right after you enter the app.
              </p>
            </div>

            <GoogleSignInButton onClick={handleGoogle} loading={googleBusy} disabled={busy} />

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
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
                <label htmlFor="register-email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={authFormInputClassName}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'register-error' : undefined}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="register-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={authFormInputClassName}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'register-error' : undefined}
                />
              </div>
              {error ? (
                <p id="register-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={busy || googleBusy}>
                {busy ? 'Creating account…' : 'Create account →'}
              </Button>
            </motion.form>
          </>
        ) : (
          <motion.div
            className="surface space-y-4 p-6"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
          >
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Confirm your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
              Open it to activate your account, then sign in.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={() => router.push(AppRoutes.home)}>
              Go to sign in
            </Button>
          </motion.div>
        )}
    </AuthSplitLayout>
  );
}
