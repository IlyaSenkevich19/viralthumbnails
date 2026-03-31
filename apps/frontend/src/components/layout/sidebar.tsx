'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteName } from '@/config/site';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  UserCircle,
  FlaskConical,
  Settings,
  LogOut,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSignOutMutation } from '@/lib/hooks';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SidebarCreditsBlock } from '@/components/layout/sidebar-credits';
import { CollapsedSidebarTooltip } from '@/components/layout/collapsed-sidebar-tooltip';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/avatars', label: 'My faces', icon: UserCircle },
  { href: '/ab-tests', label: 'A/B Tests', icon: FlaskConical, soon: true },
  { href: '/settings', label: 'Settings', icon: Settings, soon: true },
];

function SidebarSlidingLabel({
  show,
  children,
  className,
  maxWidthClass = 'max-w-[13rem]',
  collapseHeight = true,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
  collapseHeight?: boolean;
}) {
  return (
    <span
      className={cn(
        'block min-w-0 overflow-hidden transition-[max-width,max-height] duration-300 ease-[var(--ease-standard)]',
        show ? cn(maxWidthClass, collapseHeight && 'max-h-24') : 'max-w-0',
        !show && collapseHeight && 'max-h-0',
        className,
      )}
      aria-hidden={!show}
    >
      <span
        className={cn(
          'inline-block whitespace-nowrap transition-[transform,opacity] duration-300 ease-[var(--ease-standard)]',
          show ? 'translate-x-0 opacity-100 delay-[55ms]' : 'translate-x-full opacity-0',
        )}
      >
        {children}
      </span>
    </span>
  );
}

function SidebarUserBlock({ collapsed, inDrawer }: { collapsed: boolean; inDrawer: boolean }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const signOut = useSignOutMutation();
  const compact = collapsed && !inDrawer;

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
        router.push('/');
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
    <div className={cn('relative', compact && 'flex w-full justify-center')} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={compact ? `${displayName} — ${email}` : undefined}
        className={cn(
          'motion-base flex items-center gap-3 text-left',
          compact
            ? 'size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-primary p-0 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/35 outline-none ring-offset-2 ring-offset-[var(--sidebar)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring'
            : 'w-full min-w-0 rounded-xl px-2 py-2.5 hover:bg-secondary',
        )}
        aria-expanded={open}
      >
        {compact ? (
          <>
            <span className="sr-only">{displayName}</span>
            {displayName.charAt(0).toUpperCase()}
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </>
        )}
        {!compact && (
          <SidebarSlidingLabel
            show
            maxWidthClass="max-w-[min(12rem,calc(100vw-8rem))]"
            className="min-w-0 flex-1"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </span>
              <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </span>
          </SidebarSlidingLabel>
        )}
      </button>
      {open && (
        <div
          className={cn(
            'absolute z-[70] rounded-xl border border-border bg-card py-1 shadow-soft',
            compact
              ? 'left-full top-1/2 ml-2 w-48 -translate-y-1/2'
              : 'bottom-full left-0 right-0 mb-1',
          )}
        >
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

export function Sidebar({
  inDrawer,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  inDrawer?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const compact = collapsed && !inDrawer;

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const effectivePath = pendingHref ?? pathname;

  return (
    <aside
      className={cn(
        'relative flex h-full min-h-screen shrink-0 flex-col border-r border-border bg-sidebar',
        'transition-[width] duration-300 ease-[var(--ease-standard)]',
        inDrawer ? 'w-full min-h-0 border-0' : 'z-10 hidden lg:flex',
        !inDrawer && (compact ? 'w-[4.5rem]' : 'w-72'),
      )}
    >
      {!inDrawer && onToggleCollapsed && (
        <div className="absolute left-full top-[2.85rem] z-[60] -translate-x-1/2">
          <CollapsedSidebarTooltip enabled={compact} label="Expand sidebar">
            <button
              type="button"
              onClick={onToggleCollapsed}
              title={compact ? undefined : 'Collapse sidebar'}
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'group flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                'border border-border bg-sidebar/95 text-muted-foreground',
                'shadow-[0_4px_24px_-6px_rgba(0,0,0,0.55),0_2px_8px_-2px_rgba(0,0,0,0.35)]',
                'backdrop-blur-md',
                'motion-base',
                'hover:border-border-hover hover:bg-card hover:text-foreground',
                'hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),0_4px_12px_-4px_rgba(0,0,0,0.4)]',
                'active:scale-[0.94]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]',
              )}
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'radial-gradient(120% 120% at 30% 20%, rgba(255,59,59,0.14), transparent 55%)',
                }}
                aria-hidden
              />
              {compact ? (
                <ChevronRight
                  className="relative h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-standard)] group-hover:translate-x-px"
                  strokeWidth={2.25}
                  aria-hidden
                />
              ) : (
                <ChevronLeft
                  className="relative h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-standard)] group-hover:-translate-x-px"
                  strokeWidth={2.25}
                  aria-hidden
                />
              )}
            </button>
          </CollapsedSidebarTooltip>
        </div>
      )}

      <div className={cn('overflow-x-hidden p-4 pb-3', compact && 'px-2')}>
        <CollapsedSidebarTooltip enabled={compact} label={siteName} className={cn(compact && 'flex w-full justify-center')}>
          <Link
            href="/dashboard"
            onClick={() => {
              if (inDrawer && pathname === '/dashboard') onClose?.();
            }}
            className={cn('flex items-center gap-2', compact && 'justify-center')}
          >
            <div className="h-9 w-9 shrink-0 rounded-xl bg-primary shadow-md shadow-primary/25" />
            {!compact && (
              <SidebarSlidingLabel show maxWidthClass="max-w-[11rem]" className="text-left">
                <span className="block truncate text-base font-semibold tracking-tight text-foreground">
                  {siteName}
                </span>
              </SidebarSlidingLabel>
            )}
            {compact && <span className="sr-only">{siteName}</span>}
          </Link>
        </CollapsedSidebarTooltip>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-1">
        <nav className={cn('flex flex-col', compact ? 'items-center gap-1' : 'space-y-0.5')}>
          {navItems.map(({ href, label, icon: Icon, soon }) => {
            const active =
              effectivePath === href ||
              (href !== '/dashboard' && effectivePath.startsWith(`${href}/`));
            const tooltipLabel = soon ? `${label} (soon)` : label;
            return (
              <CollapsedSidebarTooltip key={href} enabled={compact} label={tooltipLabel}>
                <Link
                  href={href}
                  onClick={() => {
                    setPendingHref(href);
                    if (inDrawer && pathname === href) onClose?.();
                  }}
                  className={cn(
                    'motion-base flex items-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    compact
                      ? 'size-10 shrink-0 justify-center rounded-xl p-0'
                      : 'gap-3 rounded-xl px-3 py-2.5',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {!compact && (
                    <SidebarSlidingLabel show maxWidthClass="max-w-[12rem]" className="min-w-0 flex-1 text-left">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate">{label}</span>
                        {soon ? (
                          <Badge
                            variant="default"
                            className="shrink-0 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide"
                          >
                            Soon
                          </Badge>
                        ) : null}
                      </span>
                    </SidebarSlidingLabel>
                  )}
                  {compact && <span className="sr-only">{tooltipLabel}</span>}
                </Link>
              </CollapsedSidebarTooltip>
            );
          })}
        </nav>
      </div>

      <div
        className={cn(
          'mt-auto border-t border-border pt-4',
          compact ? 'flex flex-col items-center gap-2 px-2 pb-3' : 'space-y-3 p-3',
        )}
      >
        <SidebarCreditsBlock
          collapsed={collapsed}
          inDrawer={!!inDrawer}
          onDrawerNavigate={inDrawer ? onClose : undefined}
        />
        <SidebarUserBlock collapsed={collapsed} inDrawer={!!inDrawer} />
      </div>
    </aside>
  );
}
