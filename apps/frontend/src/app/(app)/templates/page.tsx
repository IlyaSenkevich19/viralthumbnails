import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Reusable thumbnail layouts and styles. This section is a placeholder for the next iteration.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Wire saved templates to <code className="rounded bg-secondary px-1 text-xs">template_id</code>{' '}
          on generation.
        </CardContent>
      </Card>
    </div>
  );
}
