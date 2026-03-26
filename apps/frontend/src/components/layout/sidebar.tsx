'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteName } from '@/config/site';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Settings, LogOut, MoreVertical } from 'lucide-react';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarUserBlock() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  async function handleSignOut() {
    await authApi.signOut();
    toast.success('Logged out');
    router.push('/auth/login');
    router.refresh();
    setOpen(false);
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const email = user.email ?? '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-100 transition-colors"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-sm font-medium">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{displayName}</p>
          <p className="truncate text-xs text-slate-500">{email}</p>
        </div>
        <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 bottom-full z-50 mb-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
        'flex h-full min-h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm',
        inDrawer ? 'border-0 min-h-0' : 'hidden lg:flex',
      )}
    >
      <div className="p-4 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-900 shadow-sm" />
          <span className="text-base font-semibold tracking-tight text-slate-900">{siteName}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                effectivePath.startsWith(href)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-500" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-100 p-3">
        <SidebarUserBlock />
      </div>
    </aside>
  );
}
