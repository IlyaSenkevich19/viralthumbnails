'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBackendSetupHealth } from '@/lib/hooks';
import { cn } from '@/lib/utils';

function StatusBadge({ ok }: { ok: boolean }) {
  if (ok) return <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">OK</Badge>;
  return (
    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
      Missing
    </Badge>
  );
}

export function SetupHealthPanel() {
  const { data, isPending, isError } = useBackendSetupHealth();

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Checking backend setup…</CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-300" />
            Pipeline setup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load setup diagnostics from backend.
        </CardContent>
      </Card>
    );
  }

  const checks = [
    { label: 'SUPABASE_URL', ok: data.checks.supabaseUrl },
    { label: 'SUPABASE_ANON_KEY', ok: data.checks.supabaseAnonKey },
    { label: 'SUPABASE_SERVICE_ROLE_KEY', ok: data.checks.supabaseServiceRoleKey },
    { label: 'OPENROUTER_API_KEY', ok: data.checks.openRouterApiKey },
  ];
  const allReady = checks.every((c) => c.ok);

  return (
    <Card className="relative overflow-hidden border-white/10 bg-[radial-gradient(ellipse_at_top_right,rgba(255,59,59,0.08),transparent_50%),var(--card)]">
      <CardHeader className="space-y-3 pb-4">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Pipeline setup
          </span>
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              allReady
                ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border border-amber-500/25 bg-amber-500/10 text-amber-300',
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {allReady ? 'Ready' : 'Needs attention'}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Runtime checks and currently active OpenRouter pipeline model map.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.label}
              className="group flex items-center justify-between rounded-xl border border-white/10 bg-background/40 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              <span className="text-xs font-medium tracking-wide text-muted-foreground/90">{item.label}</span>
              <StatusBadge ok={item.ok} />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            Pipeline models
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-background/40 p-3.5">
              <p className="text-xs text-muted-foreground">Video understanding (primary)</p>
              <p className="mt-1.5 text-sm font-medium text-foreground/95">{data.pipelineModels.vlPrimary}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/40 p-3.5">
              <p className="text-xs text-muted-foreground">Video understanding (fallback)</p>
              <p className="mt-1.5 text-sm font-medium text-foreground/95">
                {data.pipelineModels.vlFallback ?? 'Not set'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/40 p-3.5">
              <p className="text-xs text-muted-foreground">Prompt refinement</p>
              <p className="mt-1.5 text-sm font-medium text-foreground/95">
                {data.pipelineModels.textRefinement ?? 'Not set'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/40 p-3.5">
              <p className="text-xs text-muted-foreground">Image generation</p>
              <p className="mt-1.5 text-sm font-medium text-foreground/95">
                {data.pipelineModels.imageGeneration}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/40 p-3.5 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Image editing</p>
              <p className="mt-1.5 text-sm font-medium text-foreground/95">{data.pipelineModels.imageEdit}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
