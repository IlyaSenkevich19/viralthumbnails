import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackendHealth } from '@/components/backend-health';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account preferences and workspace status. More options will appear here as the product grows.
        </p>
      </div>

      <Card>
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
      </Card>

      <Card>
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
      </Card>
    </div>
  );
}
