import { memo } from 'react';
import { Loader2 } from 'lucide-react';
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
    <div className="mt-8 flex justify-end">
      <Button
        type="button"
        size="lg"
        disabled={!canLoadAssets || primaryBusy || cannotAffordGenerate}
        className="w-full sm:w-auto sm:min-w-[200px]"
        onClick={onGenerate}
      >
        {primaryBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : null}
        <span className="font-semibold">
          {videoPreparing
            ? 'Preparing video…'
            : primaryBusy
              ? mode === DASHBOARD_CREATE_HUB_MODE.video
                ? 'Working…'
                : 'Creating…'
              : 'Generate thumbnails'}
        </span>
      </Button>
    </div>
  );
});
