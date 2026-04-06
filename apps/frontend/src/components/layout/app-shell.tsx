'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMutating } from '@tanstack/react-query';
import { createProjectAndGenerateMutationKey } from '@/lib/hooks';
import { PageFrameProvider } from '@/contexts/page-frame-context';
import { Sidebar } from './sidebar';
import { HeaderShell } from './header-shell';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'vt-sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const creatingProject = useIsMutating({ mutationKey: createProjectAndGenerateMutationKey }) > 0;
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSidebarOpen]);

  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="flex flex-1 min-h-0 overflow-visible">
        <Sidebar
          collapsed={hydrated && sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
        <PageFrameProvider>
          <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
            <HeaderShell onMobileMenuClick={openMobileSidebar} />
            <main className="min-h-0 flex-1 overflow-auto">
              <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-10 lg:pb-14 lg:pt-10">
                {creatingProject ? (
                  <div
                    className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    Creating project and generating thumbnails…
                  </div>
                ) : null}
                {children}
              </div>
            </main>
          </div>
        </PageFrameProvider>
      </div>

      {/* Mobile drawer: when closed, wrapper must not capture hits (z-40 sits above header z-30). */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileSidebarOpen}
      >
        <button
          type="button"
          tabIndex={mobileSidebarOpen ? 0 : -1}
          aria-label={mobileSidebarOpen ? 'Close menu' : undefined}
          className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-[var(--ease-standard)]"
          style={{ opacity: mobileSidebarOpen ? 1 : 0, pointerEvents: mobileSidebarOpen ? 'auto' : 'none' }}
          onClick={closeMobileSidebar}
        />
        <div
          className="absolute inset-y-0 left-0 z-10 w-80 max-w-full border-r border-border bg-sidebar shadow-premium transition-transform duration-300 ease-[var(--ease-standard)]"
          style={{
            transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            pointerEvents: mobileSidebarOpen ? 'auto' : 'none',
          }}
        >
          <Sidebar inDrawer onClose={closeMobileSidebar} />
        </div>
      </div>
    </div>
  );
}
