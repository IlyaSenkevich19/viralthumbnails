'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { HeaderShell } from './header-shell';

const STORAGE_KEY = 'vt-sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    if (mobileSidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileSidebarOpen]);

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
      <div className="flex flex-1 min-h-0">
        <Sidebar
          collapsed={hydrated && sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderShell
            className="lg:hidden"
            onMobileMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile drawer: keep mounted for enter/exit transitions */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        aria-hidden={!mobileSidebarOpen}
      >
        <button
          type="button"
          tabIndex={mobileSidebarOpen ? 0 : -1}
          aria-label={mobileSidebarOpen ? 'Close menu' : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-[var(--ease-standard)]"
          style={{ opacity: mobileSidebarOpen ? 1 : 0, pointerEvents: mobileSidebarOpen ? 'auto' : 'none' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <div
          className="absolute inset-y-0 left-0 w-80 max-w-full border-r border-border bg-sidebar shadow-premium transition-transform duration-300 ease-[var(--ease-standard)]"
          style={{
            transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            pointerEvents: mobileSidebarOpen ? 'auto' : 'none',
          }}
        >
          <Sidebar
            inDrawer
            onClose={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
