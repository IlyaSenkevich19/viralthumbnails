'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout, authFormInputClassName } from '@/components/auth/auth-split-layout';
import { useUpdatePasswordMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { InfoHint } from '@/components/ui/info-hint';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AppRoutes } from '@/config/routes';
import { vtSpring } from '@/lib/motion-presets';

export default function UpdatePasswordPage() {
  const reduceMotion = useReducedMotion();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const update = useUpdatePasswordMutation();

  const validationOrApiError = Boolean(error);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    update.mutate(password, {
      onSuccess: () => {
        toast.success('Password updated. You can sign in.');
        router.push(AppRoutes.home);
        router.refresh();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Could not update password.');
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-foreground">
            Choose a new <span className="text-primary">password</span>
          </h1>
          <InfoHint
            className="shrink-0"
            buttonLabel="How this reset link works"
            helpBody={
              <p>
                Open through the ViralThumblify reset email. If this link expires, request a replacement from Sign in →
                Forgot password.
              </p>
            }
          />
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
          <label htmlFor="new-password" className="text-sm font-medium text-foreground">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authFormInputClassName}
            aria-invalid={validationOrApiError ? true : undefined}
            aria-describedby={validationOrApiError ? 'update-password-error' : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
            Confirm password
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={authFormInputClassName}
            aria-invalid={validationOrApiError ? true : undefined}
            aria-describedby={validationOrApiError ? 'update-password-error' : undefined}
          />
        </div>
        {error ? (
          <p id="update-password-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save password →'}
        </Button>
      </motion.form>

      <p className="text-center text-xs text-muted-foreground">
        Need another link?{' '}
        <Link
          href={AppRoutes.auth.forgotPassword}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Send reset email
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
