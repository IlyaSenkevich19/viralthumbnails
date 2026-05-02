'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout, authFormInputClassName } from '@/components/auth/auth-split-layout';
import { useResetPasswordMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppRoutes } from '@/config/routes';
import { PASSWORD_RESET_EMAIL_SESSION_KEY } from '@/lib/auth-password-reset-flow';
import { vtSpring } from '@/lib/motion-presets';

export default function ForgotPasswordPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const reset = useResetPasswordMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    reset.mutate(trimmed, {
      onSuccess: () => {
        try {
          sessionStorage.setItem(PASSWORD_RESET_EMAIL_SESSION_KEY, trimmed);
        } catch {
          /* ignore */
        }
        router.push(AppRoutes.auth.resetLinkSent);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Could not send reset email.');
      },
    });
  }

  return (
    <AuthSplitLayout
      headerRight={
        <Link href={AppRoutes.home} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      }
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Reset your <span className="text-primary">password</span>
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          We&apos;ll email a ViralThumblify reset link whenever this address belongs to an account.
        </p>
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
          <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
            Your email
          </label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authFormInputClassName}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'forgot-password-error' : undefined}
          />
        </div>
        {error ? (
          <p id="forgot-password-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={reset.isPending}>
          {reset.isPending ? 'Sending…' : 'Send reset link →'}
        </Button>
      </motion.form>

      <p className="text-center text-xs text-muted-foreground">
        Remember your password?{' '}
        <Link href={AppRoutes.home} className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
