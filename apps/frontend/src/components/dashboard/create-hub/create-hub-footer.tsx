import { memo } from 'react';
import Link from 'next/link';
import { FolderKanban, Loader2, Sparkles } from 'lucide-react';
import { AppRoutes } from '@/config/routes';
import { DASHBOARD_CREATE_HUB_MODE } from '../dashboard-create-hub.utils';
import type { HubMode } from '../dashboard-create-hub.utils';
import { Button } from '@/components/ui/button';

type Props = {
  canLoadAssets: boolean;
  onGenerate: () => void;
  primaryBusy: boolean;
  videoPreparing: boolean;
  mode: HubMode;
  cannotAffordGenerate: boolean;
};

export const CreateHubFooter = memo(function CreateHubFooter({
  canLoadAssets,
  onGenerate,
  primaryBusy,
  videoPreparing,
  mode,
  cannotAffordGenerate,
}: Props) {
  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link
          href={AppRoutes.projects}
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          <FolderKanban className="h-4 w-4" aria-hidden />
          Projects
        </Link>
      </div>
      <Button
        type="button"
        size="lg"
        disabled={!canLoadAssets || primaryBusy || cannotAffordGenerate}
        className="w-full sm:w-auto sm:min-w-[200px]"
        onClick={onGenerate}
      >
        {primaryBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-5 w-5" aria-hidden />
        )}
        <span className="font-semibold">
          {videoPreparing
            ? 'Preparing video…'
            : primaryBusy
              ? mode === DASHBOARD_CREATE_HUB_MODE.video
                ? 'Working…'
                : 'Creating…'
              : mode === DASHBOARD_CREATE_HUB_MODE.video
                ? 'Analyze video'
                : 'Generate'}
        </span>
      </Button>
    </div>
  );
});
