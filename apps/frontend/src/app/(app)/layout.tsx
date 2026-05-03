import { AppShell } from '@/components/layout/app-shell';
import { LeadQualificationGate } from '@/components/layout/lead-qualification-gate';
import { TrialWelcomeGate } from '@/components/layout/trial-welcome-gate';
import { WithPipelineActivity } from '@/components/layout/with-pipeline-activity';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WithPipelineActivity>
      <LeadQualificationGate>
        <TrialWelcomeGate>
          <AppShell>{children}</AppShell>
        </TrialWelcomeGate>
      </LeadQualificationGate>
    </WithPipelineActivity>
  );
}
