'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useProjectWithVariants, useDeleteVariantMutation } from '@/lib/hooks';
import { humanizeKey } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VariantThumbnailCard } from '@/components/projects/variant-thumbnail-card';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

function VariantCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="flex justify-between gap-2 p-4">
        <Skeleton className="h-6 w-20 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function VariantsGallery({ projectId }: { projectId: string }) {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const hasSession = Boolean(user?.id && accessToken);
  const { data, error, isPending, isError, refetch, isFetching } = useProjectWithVariants(projectId);
  const deleteVariant = useDeleteVariantMutation(projectId);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);

  async function handleRefresh() {
    const result = await refetch();
    if (result.isError) {
      toast.error(result.error instanceof Error ? result.error.message : 'Refresh failed');
    } else {
      toast.success('Updated');
    }
  }

  if (authLoading || (hasSession && isPending)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div>
          <Skeleton className="mb-2 h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <VariantCardSkeleton />
          <VariantCardSkeleton />
          <VariantCardSkeleton />
        </div>
      </div>
    );
  }

  if (!authLoading && !hasSession) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <p className="text-sm text-destructive" role="alert">
          You need to be signed in to view this project.
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : 'Project not found'}
        </p>
      </div>
    );
  }

  const variants = data.thumbnail_variants ?? [];
  const refreshing = isFetching && !isPending;

  return (
    <div className="space-y-6">
      <ConfirmationModal
        open={variantToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setVariantToDelete(null);
        }}
        title="Remove this image?"
        description="This generated thumbnail will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (!variantToDelete) return;
          const id = variantToDelete;
          setVariantToDelete(null);
          deleteVariant.mutate(id);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{data.title}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{data.platform}</span>
          <span aria-hidden> · </span>
          {humanizeKey(data.source_type)}
        </p>
      </div>

      {variants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No variants yet.{' '}
            <Link href="/dashboard" className="text-primary underline-offset-4 hover:underline">
              Start from the dashboard
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((v) => (
            <VariantThumbnailCard
              key={v.id}
              projectTitle={data.title}
              variant={v}
              hasImage={Boolean(v.generated_image_url)}
              onDelete={() => setVariantToDelete(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
