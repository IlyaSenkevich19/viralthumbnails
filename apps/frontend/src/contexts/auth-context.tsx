'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchAuthBootstrap } from '@/lib/api/auth-bootstrap';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  /** Set only when signed in (`user` present); `false` means user still needs `/welcome-trial`. */
  trialStarted: boolean | null;
  /** Re-read `/auth/me` after mutations (e.g. start trial). */
  refreshTrialBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [trialStarted, setTrialStarted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrate = useCallback(async (session: Session | null) => {
    setUser(session?.user ?? null);
    setAccessToken(session?.access_token ?? null);
    if (!session?.access_token || !session.user) {
      setTrialStarted(null);
      return;
    }
    try {
      const me = await fetchAuthBootstrap(session.access_token);
      setTrialStarted(me.trialStarted);
    } catch {
      setTrialStarted(true);
    }
  }, []);

  const refreshTrialBootstrap = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const t = session?.access_token;
    if (!session?.user || !t) {
      setTrialStarted(null);
      return;
    }
    try {
      const me = await fetchAuthBootstrap(t);
      setTrialStarted(me.trialStarted);
    } catch {
      setTrialStarted(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubAuthListener: (() => void) | undefined;

    async function bootstrapFrom(session: Session | null) {
      await hydrate(session);
      if (!cancelled) setIsLoading(false);
    }

    void (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setIsLoading(true);
      await bootstrapFrom(session);

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        if (cancelled) return;
        setIsLoading(true);
        await bootstrapFrom(session);
      });
      unsubAuthListener = () => data.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      unsubAuthListener?.();
    };
  }, [hydrate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        accessToken,
        trialStarted,
        refreshTrialBootstrap,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
