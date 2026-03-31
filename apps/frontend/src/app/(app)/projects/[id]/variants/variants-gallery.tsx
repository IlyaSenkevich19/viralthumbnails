'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useProjectWithVariants } from '@/lib/hooks';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AppRoutes } from '@/config/routes';
import { toast } from 'sonner';
import { ProjectVariantsWorkspace } from '@/components/projects/project-variants-workspace';

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="w-full space-y-4 lg:w-[44rem]">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="aspect-video rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

function VariantsGalleryInner({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get('template_id');
  const initialAvatarId = searchParams.get('avatar_id');
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const hasSession = Boolean(user?.id && accessToken);
  const { data, error, isPending, isError, refetch, isFetching } = useProjectWithVariants(projectId);

  async function handleRefresh() {
    const result = await refetch();
    if (result.isError) {
      toast.error(result.error instanceof Error ? result.error.message : 'Refresh failed');
    } else {
      toast.success('Updated');
    }
  }

  if (authLoading || (hasSession && isPending)) {
    return <WorkspaceSkeleton />;
  }

  if (!authLoading && !hasSession) {
    return (
      <div className="space-y-4">
        <Link
          href={AppRoutes.projects}
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
          href={AppRoutes.projects}
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

  const refreshing = isFetching && !isPending;

  return (
    <ProjectVariantsWorkspace
      project={data}
      projectId={projectId}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      initialTemplateId={initialTemplateId}
      initialAvatarId={initialAvatarId}
    />
  );
}

export function VariantsGallery({ projectId }: { projectId: string }) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <VariantsGalleryInner projectId={projectId} />
    </Suspense>
  );
}
