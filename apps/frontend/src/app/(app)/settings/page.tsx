import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackendHealth } from '@/components/backend-health';
import { SetPageFrame } from '@/components/layout/set-page-frame';
import { SetupHealthPanel } from '@/components/settings/setup-health-panel';
import { PrimaryActionPanel } from '@/components/ui/primary-action-panel';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <SetPageFrame title="Settings" />

      <PrimaryActionPanel>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workspace preferences</CardTitle>
          <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            Personal knobs for thumbnail generation workflows—more controls arrive as preferences ship.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Preference controls will appear here in upcoming updates.</p>
          <p>Currently available: diagnostics below to verify backend and model setup.</p>
        </CardContent>
      </PrimaryActionPanel>

      <PrimaryActionPanel>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Diagnostics</CardTitle>
          <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            Confirms authenticated calls can reach the ViralThumblify backend you configured.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <BackendHealth />
          <p className="text-sm text-muted-foreground">
            If this shows an error, check that the backend is running and your environment variables
            point to the correct API URL.
          </p>
        </CardContent>
      </PrimaryActionPanel>

      <SetupHealthPanel />
    </div>
  );
}
