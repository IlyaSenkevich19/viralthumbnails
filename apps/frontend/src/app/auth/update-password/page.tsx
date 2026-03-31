'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteName } from '@/config/site';
import { useUpdatePasswordMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const update = useUpdatePasswordMutation();

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
        router.push('/');
        router.refresh();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Could not update password.');
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 sm:px-10">
      <header className="mx-auto mb-8 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <div className="h-8 w-8 rounded-xl bg-primary shadow-md shadow-primary/25" />
          <span className="font-semibold tracking-tight">{siteName}</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this page from the link in your email. If the session expired, request a new reset from
          sign-in.
        </p>

        <form onSubmit={handleSubmit} className="surface mt-8 space-y-4 p-6">
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </main>
    </div>
  );
}
