'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { HeaderShell } from './header-shell';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderShell onMenuClick={() => setMobileSidebarOpen(true)} className="lg:hidden" />
          <main className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-full border-r border-border bg-sidebar shadow-premium"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar inDrawer onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
