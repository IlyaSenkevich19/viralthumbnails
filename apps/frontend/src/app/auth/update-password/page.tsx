'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout, authFormInputClassName } from '@/components/auth/auth-split-layout';
import { useUpdatePasswordMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AppRoutes } from '@/config/routes';

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
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Choose a new <span className="text-primary">password</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open this screen from your ViralThumblify reset email. If your link expired, request a new reset from
          sign-in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="surface relative space-y-4 overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="space-y-1">
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
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={authFormInputClassName}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save password →'}
        </Button>
      </form>

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
