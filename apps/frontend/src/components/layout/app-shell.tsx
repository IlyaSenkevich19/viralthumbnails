'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Menu } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="lg:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-border/60 bg-card/80 backdrop-blur-sm px-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <main className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar inDrawer onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
