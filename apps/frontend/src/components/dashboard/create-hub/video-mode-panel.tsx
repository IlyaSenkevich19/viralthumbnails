import { memo, type Dispatch, type SetStateAction } from 'react';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { Input } from '@/components/ui/input';

type Props = {
  onVideoFileChange: (file: File | null) => void;
  videoRemoteUrl: string;
  onVideoRemoteUrlChange: Dispatch<SetStateAction<string>>;
};

export const VideoModePanel = memo(function VideoModePanel({
  onVideoFileChange,
  videoRemoteUrl,
  onVideoRemoteUrlChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="dash-video-file" className="text-sm font-medium text-foreground">
          Video file
        </label>
        <Input
          id="dash-video-file"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          onChange={(e) => onVideoFileChange(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">
          First {VIDEO_ANALYSIS_MAX_SECONDS / 60} min analyzed (trimmed in browser). Huge files: shorter clip or URL.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="dash-video-url" className="text-sm font-medium text-foreground">
          Or video URL
        </label>
        <Input
          id="dash-video-url"
          placeholder="https://… (direct file link)"
          value={videoRemoteUrl}
          onChange={(e) => onVideoRemoteUrlChange(e.target.value)}
          inputMode="url"
        />
      </div>
      <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        After upload, you will continue on the project page where you can select templates, pick a face, and run
        additional generations.
      </p>
    </div>
  );
});
