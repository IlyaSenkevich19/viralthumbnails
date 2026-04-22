import { AppShell } from '@/components/layout/app-shell';
import { WithPipelineActivity } from '@/components/layout/with-pipeline-activity';
import { NewProjectModal } from '@/components/new-project-modal';
import { NewProjectProvider } from '@/contexts/new-project-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NewProjectProvider>
      <WithPipelineActivity>
        <AppShell>{children}</AppShell>
        <NewProjectModal />
      </WithPipelineActivity>
    </NewProjectProvider>
  );
}
