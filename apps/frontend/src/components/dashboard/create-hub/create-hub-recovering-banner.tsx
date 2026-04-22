import { memo } from 'react';
import { Loader2 } from 'lucide-react';

type Props = { show: boolean };

export const CreateHubRecoveringBanner = memo(function CreateHubRecoveringBanner({ show }: Props) {
  if (!show) return null;
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      Recovering previous generation...
    </div>
  );
});
