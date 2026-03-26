import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AbTestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">A/B Tests</h1>
        <p className="text-sm text-muted-foreground">
          Compare thumbnail performance. Placeholder until analytics and experiments are connected.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You will pick variants, set traffic split, and track CTR from YouTube or your analytics stack.
        </CardContent>
      </Card>
    </div>
  );
}
