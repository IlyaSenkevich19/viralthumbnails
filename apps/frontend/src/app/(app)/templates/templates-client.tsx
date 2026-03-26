'use client';

import { useTemplatesList } from '@/lib/hooks';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TemplatesClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const hasSession = Boolean(user?.id && accessToken);
  const { data: items = [], isPending, isError, error } = useTemplatesList();

  const loading = authLoading || (hasSession && isPending);
  const listError =
    !authLoading && !hasSession
      ? 'Not signed in'
      : isError
        ? (error as Error).message
        : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Templates are served from Storage (<code className="rounded bg-secondary px-1 text-xs">thumbnail-templates</code>
          ) under <code className="rounded bg-secondary px-1 text-xs">system/</code>, your user id folder, or the bucket
          root. Rows in <code className="rounded bg-secondary px-1 text-xs">thumbnail_templates</code> are optional;
          files without a row still show up here.
        </p>
      </div>

      {listError && (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : hasSession && items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No templates found. Upload images in the Dashboard (bucket root,{' '}
            <code className="rounded bg-secondary px-1 text-xs">system/</code>, or your user folder) or create via{' '}
            <code className="rounded bg-secondary px-1 text-xs">POST /api/templates</code>.
          </CardContent>
        </Card>
      ) : hasSession && items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {t.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.preview_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No preview
                  </div>
                )}
              </div>
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                  <Badge variant="default" className="shrink-0 text-[10px]">
                    {t.user_id ? 'Yours' : 'System'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">slug: {t.slug}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
