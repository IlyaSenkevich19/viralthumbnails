import { FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AbTestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">A/B tests</h1>
        <p className="text-sm text-muted-foreground">
          Compare thumbnail variants and learn which creative drives more clicks.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FlaskConical className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">Coming soon</CardTitle>
              <p className="text-sm text-muted-foreground">
                We&apos;re building experiments on top of your generated variants.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-5 text-sm text-muted-foreground">
          <p>You&apos;ll be able to:</p>
          <ul className="list-inside list-disc space-y-1.5">
            <li>Pick two or more thumbnails for the same video</li>
            <li>Set how traffic or time is split between them</li>
            <li>Track results using YouTube analytics or your own data source</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
