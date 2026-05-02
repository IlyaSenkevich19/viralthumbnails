'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { InfoHint } from '@/components/ui/info-hint';
import { buttonVariants } from '@/components/ui/button';
import { AppRoutes } from '@/config/routes';
import { cn } from '@/lib/utils';
import { PASSWORD_RESET_EMAIL_SESSION_KEY } from '@/lib/auth-password-reset-flow';
import { vtSpring } from '@/lib/motion-presets';

export default function ResetLinkSentPage() {
  const reduceMotion = useReducedMotion();
  const [hintEmail, setHintEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PASSWORD_RESET_EMAIL_SESSION_KEY);
      if (raw) {
        setHintEmail(raw);
        sessionStorage.removeItem(PASSWORD_RESET_EMAIL_SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
            Check your <span className="text-primary">inbox</span>
          </h1>
          <InfoHint
            className="shrink-0"
            buttonLabel="Reset email delivery timing"
            helpBody={
              <p>
                Matching workspaces get a ViralThumblify reset link—inboxes can lag about a minute, so skim spam if needed.
              </p>
            }
          />
        </div>
      </div>

      <motion.div
        className="surface relative space-y-4 overflow-hidden p-6"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : vtSpring.reveal}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex justify-center pt-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <Mail className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            {hintEmail ? (
              <>
                Look for a message about resetting your password to{' '}
                <span className="break-all font-medium text-foreground">{hintEmail}</span>.
              </>
            ) : (
              <>
                Look for an email about resetting your ViralThumblify password. Spam folder is worth checking too.
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            The link expires after a while. If it stops working, start again from sign-in → Forgot password.
          </p>
        </div>
        <Link
          href={AppRoutes.home}
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
        >
          Back to sign in
        </Link>
      </motion.div>

      <Link
        href={AppRoutes.auth.forgotPassword}
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'w-full justify-center text-muted-foreground hover:text-foreground',
        )}
      >
        Use another email
      </Link>
    </AuthSplitLayout>
  );
}
