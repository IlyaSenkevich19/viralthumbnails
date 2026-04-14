'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandWordmark } from '@/components/layout/brand-wordmark';
import { useResetPasswordMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppRoutes } from '@/config/routes';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const reset = useResetPasswordMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    reset.mutate(email, {
      onSuccess: () => setSent(true),
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Could not send reset email.');
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 sm:px-10">
      <header className="mx-auto mb-8 flex w-full max-w-md items-center justify-between">
        <BrandWordmark className="text-base" />
        <Link href={AppRoutes.home} className="text-sm text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll email you a link to choose a new password.
        </p>

        {sent ? (
          <div className="surface mt-8 p-5 text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, check
            your inbox for the reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="surface mt-8 space-y-4 p-6">
            <div className="space-y-1">
              <label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={reset.isPending}>
              {reset.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
