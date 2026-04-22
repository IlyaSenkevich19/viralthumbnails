import { memo } from 'react';
import { isLikelyYoutubeUrl } from '@/lib/format';
import { Input } from '@/components/ui/input';
import type { YoutubeMetaPreview } from '../dashboard-create-hub.utils';

type Props = {
  youtubeUrl: string;
  onYoutubeUrlChange: (value: string) => void;
  onBlurEnrich: () => void;
  accessToken: string | null;
  urlError: string;
  youtubeMetaPreview: YoutubeMetaPreview | null;
};

export const YoutubeModePanel = memo(function YoutubeModePanel({
  youtubeUrl,
  onYoutubeUrlChange,
  onBlurEnrich,
  accessToken,
  urlError,
  youtubeMetaPreview,
}: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="dash-youtube" className="text-sm font-medium text-foreground">
        YouTube URL
      </label>
      <Input
        id="dash-youtube"
        placeholder="https://www.youtube.com/watch?v=…"
        value={youtubeUrl}
        onChange={(e) => onYoutubeUrlChange(e.target.value)}
        onBlur={() => {
          const value = youtubeUrl.trim();
          if (!value || !isLikelyYoutubeUrl(value) || !accessToken) return;
          onBlurEnrich();
        }}
        inputMode="url"
        autoComplete="url"
        aria-invalid={Boolean(urlError)}
      />
      {youtubeMetaPreview ? (
        <div className="surface mt-2 flex items-center gap-3 p-2.5">
          {youtubeMetaPreview.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={youtubeMetaPreview.thumbnail}
              alt=""
              className="h-12 w-20 shrink-0 rounded-md object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {youtubeMetaPreview.title || 'YouTube video'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {youtubeMetaPreview.author || 'Unknown channel'}
            </p>
          </div>
        </div>
      ) : null}
      {urlError ? (
        <p className="text-sm text-destructive" role="alert">
          {urlError}
        </p>
      ) : null}
    </div>
  );
});
