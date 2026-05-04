'use client';

import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/layout/brand-wordmark';
import { AuthThumbnailMarquee } from '@/components/auth/auth-thumbnail-marquee';

type AuthSplitLayoutProps = {
  /** Right side of the header (e.g. Sign up / Sign in links). */
  headerRight?: ReactNode;
  children: ReactNode;
};

/**
 * Same two-column shell as Sign in: form column + marketing / marquee (hidden on small screens).
 */
export function AuthSplitLayout({ headerRight, children }: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] items-stretch bg-background">
      <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16">
        <header className="mb-10 flex items-center justify-between">
          <BrandWordmark className="text-base" />
          {headerRight ? <div className="text-sm text-muted-foreground">{headerRight}</div> : null}
        </header>

        <main className="flex flex-1 items-center">
          <div className="w-full max-w-md space-y-8">{children}</div>
        </main>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden border-l border-border bg-card text-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,59,59,0.08),_transparent_55%),_radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.04),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_60%,_rgba(0,0,0,0.15))]" />
        <div className="relative z-[2] w-full space-y-12 px-10">
          <div className="mx-auto max-w-xl space-y-6">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <h2 className="max-w-xl min-w-0 text-3xl font-semibold leading-tight">
                Analyze footage.
                <br />
                Generate thumbnails; revise until they stick.
              </h2>
            </div>
          </div>
          <AuthThumbnailMarquee />
        </div>
      </div>
    </div>
  );
}

/** Shared input styling for auth forms (Sign in, reset password, etc.). */
export const authFormInputClassName =
  'motion-base h-auto rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';
