'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteName } from '@/config/site';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  FlaskConical,
  Settings,
  LogOut,
  MoreVertical,
} from 'lucide-react';
import { useSignOutMutation } from '@/lib/hooks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/ab-tests', label: 'A/B Tests', icon: FlaskConical },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarUserBlock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const signOut = useSignOutMutation();

  useEffect(() => {
    if (!ref.current) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast.success('Logged out');
        router.push('/auth/login');
        router.refresh();
        setOpen(false);
      },
      onError: () => {
        toast.error('Could not sign out');
      },
    });
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const email = user.email ?? '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="motion-base flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-secondary"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-xl border border-border bg-card py-1 shadow-soft">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOut.isPending}
            className="motion-base flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ inDrawer, onClose }: { inDrawer?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const effectivePath = pendingHref ?? pathname;

  return (
    <aside
      className={cn(
        'flex h-full min-h-screen w-72 shrink-0 flex-col border-r border-border bg-sidebar',
        inDrawer ? 'border-0 min-h-0' : 'hidden lg:flex',
      )}
    >
      <div className="p-4 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary shadow-md shadow-primary/25" />
          <span className="text-base font-semibold tracking-tight text-foreground">{siteName}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        <nav className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => {
                setPendingHref(href);
                if (inDrawer) onClose?.();
              }}
              className={cn(
                'motion-base flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                effectivePath === href || (href !== '/dashboard' && effectivePath.startsWith(`${href}/`))
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-3">
        <SidebarUserBlock />
      </div>
    </aside>
  );
}
