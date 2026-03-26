import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and app preferences. Extend this route with forms, billing, or integrations.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Copy <code className="rounded bg-secondary px-1 text-xs">.env.example</code> to{' '}
            <code className="rounded bg-secondary px-1 text-xs">.env</code>, run the optional Supabase
            SQL migration, then <code className="rounded bg-secondary px-1 text-xs">yarn dev</code> from
            the repo root.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
