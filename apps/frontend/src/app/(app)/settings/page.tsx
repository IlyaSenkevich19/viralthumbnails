import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackendHealth } from '@/components/backend-health';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { SetupHealthPanel } from '@/components/settings/setup-health-panel';
import { PrimaryActionPanel } from '@/components/ui/primary-action-panel';
import { SectionHeading } from '@/components/ui/section-heading';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <SetPageFrame title="Settings" />

      <PrimaryActionPanel>
        <CardHeader className="pb-2">
          <SectionHeading
            title={<CardTitle className="text-base">Workspace preferences</CardTitle>}
            helpLabel="About workspace preferences"
            helpBody={
              <>
                <p className="text-foreground">
                  Personal knobs for thumbnail generation workflows — more controls will appear here over time as
                  preferences ship.
                </p>
                <p className="mt-2">
                  Preferential controls aren&apos;t wired yet; use diagnostics below meanwhile to validate backend setup.
                </p>
              </>
            }
          />
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Coming soon.</p>
        </CardContent>
      </PrimaryActionPanel>

      <PrimaryActionPanel>
        <CardHeader className="pb-2">
          <SectionHeading
            title={<CardTitle className="text-base">Diagnostics</CardTitle>}
            helpLabel="What diagnostics checks"
            helpBody={
              <>
                <p>
                  Confirms authenticated calls reach the ViralThumblify backend you pointed this app at. If API health
                  shows an error, ensure the backend is running and env vars resolve to the intended API URL.
                </p>
              </>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-3">
          <BackendHealth />
        </CardContent>
      </PrimaryActionPanel>

      <SetupHealthPanel />
    </div>
  );
}
