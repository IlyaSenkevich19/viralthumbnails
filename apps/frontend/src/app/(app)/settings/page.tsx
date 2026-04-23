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
          <CardTitle className="text-base">Account</CardTitle>
          <p className="text-sm text-muted-foreground">
            Profile and sign-in are managed through your auth provider.
          </p>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the account menu in the sidebar to sign out. Password changes and email updates can be
          added here or linked to your auth provider&apos;s flows.
        </CardContent>
      </PrimaryActionPanel>

      <PrimaryActionPanel>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">App connection</CardTitle>
          <p className="text-sm text-muted-foreground">Whether the app can reach the API server.</p>
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
