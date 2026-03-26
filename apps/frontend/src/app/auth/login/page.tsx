'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { siteName } from '@/config/site';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.signIn(email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await authApi.signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in with Google.';
      setError(message);
      toast.error(message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50">
      {/* Left: form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-10 lg:px-16 py-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-900" />
            <span className="font-semibold tracking-tight text-slate-900">{siteName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/auth/register" className="text-slate-900 font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Sign in to <span className="text-slate-600">your account</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Use the email and password you registered with.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-lg p-6">
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                disabled={loading || googleLoading}
              >
                {loading ? 'Signing in...' : 'Login →'}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-white hover:bg-slate-50 flex items-center justify-center gap-2"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white">
                <Image
                  src="/google-logo.svg"
                  alt="Google"
                  width={16}
                  height={16}
                  priority
                />
              </span>
              <span className="text-sm font-medium text-slate-800">
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </span>
            </Button>
          </div>
        </main>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%),_radial-gradient(circle_at_bottom,_#94a3b8,_transparent_60%)]" />
        <div className="relative max-w-xl space-y-6 px-10">
          <h2 className="text-3xl font-semibold leading-tight">
            Ship faster
            <br />
            on a clean stack.
          </h2>
          <p className="text-sm text-slate-200/90">
            Next.js, Supabase Auth, and NestJS in one monorepo—add your product logic on top.
          </p>
        </div>
      </div>
    </div>
  );
}
