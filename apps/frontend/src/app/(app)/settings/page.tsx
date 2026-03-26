import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and app preferences. Extend this route with forms, billing, or integrations.
        </p>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Copy <code className="text-xs bg-muted px-1 rounded">.env.example</code> to{' '}
          <code className="text-xs bg-muted px-1 rounded">.env</code>, run the optional Supabase SQL
          migration, then <code className="text-xs bg-muted px-1 rounded">yarn dev</code> from the repo
          root.</p>
        </CardContent>
      </Card>
    </div>
  );
}
