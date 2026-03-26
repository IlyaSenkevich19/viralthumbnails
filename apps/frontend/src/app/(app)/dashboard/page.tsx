import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackendHealth } from '@/components/backend-health';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Replace this page with your product home. The badge checks{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">GET /api/health</code> via the
            Next.js rewrite to NestJS (see{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">NEXT_PUBLIC_BACKEND_URL</code>
            ).
          </p>
        </div>
        <BackendHealth />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frontend</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Next.js App Router, Supabase Auth (client + middleware), Tailwind, shadcn-style UI.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Backend</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              NestJS with <code className="rounded bg-secondary px-1 text-xs">/api/auth/me</code>{' '}
              (Bearer) and <code className="rounded bg-secondary px-1 text-xs">/api/health</code>.
              Swagger at <code className="rounded bg-secondary px-1 text-xs">/api/docs</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
