'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteName } from '@/config/site';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.signUp(email, password);
      setRegistered(true);
      toast.success('Confirm your email to activate account.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign up. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50">
      {/* Left: form / confirmation */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-10 lg:px-16 py-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-900" />
            <span className="font-semibold tracking-tight text-slate-900">{siteName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-slate-900 font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center">
          <div className="w-full max-w-md space-y-8">
            {!registered ? (
              <>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    Create your <span className="text-slate-600">account</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sign up with email. You can wire OAuth in Supabase when you are ready.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 bg-white rounded-2xl shadow-lg p-6"
                >
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-800">Your email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-800">Password</label>
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
                  <Button
                    type="submit"
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Get started →'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="space-y-4 bg-white rounded-2xl shadow-lg p-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
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
                  onClick={() => router.push('/auth/login')}
                >
                  Go to sign in
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%),_radial-gradient(circle_at_bottom,_#94a3b8,_transparent_60%)]" />
        <div className="relative max-w-xl space-y-6 px-10">
          <h2 className="text-3xl font-semibold leading-tight">
            One template,
            <br />
            your product.
          </h2>
          <p className="text-sm text-slate-200/90">
            Auth, layout, and API wiring are done—focus on features your users care about.
          </p>
        </div>
      </div>
    </div>
  );
}
