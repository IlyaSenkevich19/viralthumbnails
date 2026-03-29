'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteName } from '@/config/site';
import { useSignUpMutation } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const router = useRouter();
  const signUp = useSignUpMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    signUp.mutate(
      { email, password },
      {
        onSuccess: () => {
          setRegistered(true);
          toast.success('Confirm your email to activate account.');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to sign up. Please try again.';
          setError(message);
          toast.error(message);
        },
      },
    );
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
            Already have an account?{' '}
            <Link href="/" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center">
          <div className="w-full max-w-md space-y-8">
            {!registered ? (
              <>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Create your <span className="text-primary">account</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sign up with email. You can wire OAuth in Supabase when you are ready.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="surface space-y-4 p-6"
                >
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
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={signUp.isPending}>
                    {signUp.isPending ? 'Creating account...' : 'Get started →'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="surface space-y-4 p-6">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Confirm your email
                </h1>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>.
                  Open it to activate your account, then sign in from the login page.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  Go to sign in
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-border bg-card text-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,59,59,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.04),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_60%,_rgba(0,0,0,0.15))]" />
        <div className="relative max-w-xl space-y-6 px-10">
          <h2 className="text-3xl font-semibold leading-tight">
            One template,
            <br />
            your product.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Auth, layout, and API wiring are done — focus on features your users care about.
          </p>
        </div>
      </div>
    </div>
  );
}
