import { AppShell } from '@/components/layout/app-shell';
import { NewProjectModal } from '@/components/new-project-modal';
import { NewProjectProvider } from '@/contexts/new-project-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewProjectProvider>
      <AppShell>{children}</AppShell>
      <NewProjectModal />
    </NewProjectProvider>
  );
}
