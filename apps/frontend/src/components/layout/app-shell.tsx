'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from './app-header';
import { Sidebar } from './sidebar';
import { useProject } from '@/contexts/project-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { setProjectId } = useProject();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get('project');
    if (fromUrl) {
      const n = parseInt(fromUrl, 10);
      if (!Number.isNaN(n)) setProjectId(n);
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [searchParams, setProjectId]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(248,113,22,0.28),rgba(255,246,242,0)_65%)] blur-2xl" />
        <div className="absolute -bottom-40 right-0 h-[520px] w-[720px] rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.24),rgba(255,246,242,0)_65%)] blur-2xl" />
      </div>

      <AppHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <Sidebar onNewCampaign={() => setShowCreateCampaign(true)} />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar inDrawer onNewCampaign={() => setShowCreateCampaign(true)} />
          </div>
        </div>
      )}
    </div>
  );
}

