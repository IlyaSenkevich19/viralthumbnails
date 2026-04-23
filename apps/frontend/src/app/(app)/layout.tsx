import { AppShell } from '@/components/layout/app-shell';
import { WithPipelineActivity } from '@/components/layout/with-pipeline-activity';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WithPipelineActivity>
      <AppShell>{children}</AppShell>
    </WithPipelineActivity>
  );
}
