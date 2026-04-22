import { memo, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown } from 'lucide-react';
import { VIDEO_ANALYSIS_MAX_SECONDS } from '@/lib/video/clip-limits';
import { Input } from '@/components/ui/input';

type Props = {
  onVideoFileChange: (file: File | null) => void;
  videoRemoteUrl: string;
  onVideoRemoteUrlChange: Dispatch<SetStateAction<string>>;
  videoCount: number;
  onVideoCountChange: (n: number) => void;
  videoStyle: string;
  onVideoStyleChange: Dispatch<SetStateAction<string>>;
  videoPrompt: string;
  onVideoPromptChange: Dispatch<SetStateAction<string>>;
  videoStylingOpen: boolean;
  onVideoStylingToggle: (open: boolean) => void;
};

export const VideoModePanel = memo(function VideoModePanel({
  onVideoFileChange,
  videoRemoteUrl,
  onVideoRemoteUrlChange,
  videoCount,
  onVideoCountChange,
  videoStyle,
  onVideoStyleChange,
  videoPrompt,
  onVideoPromptChange,
  videoStylingOpen,
  onVideoStylingToggle,
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
      <div className="space-y-1.5">
        <label htmlFor="dash-video-count" className="text-sm font-medium text-foreground">
          Thumbnail count (1–12)
        </label>
        <Input
          id="dash-video-count"
          type="number"
          min={1}
          max={12}
          value={videoCount}
          onChange={(e) => onVideoCountChange(Number(e.target.value))}
        />
      </div>

      <details
        className="group rounded-xl border border-border/80 bg-muted/15 [&_summary::-webkit-details-marker]:hidden"
        open={videoStylingOpen}
        onToggle={(e) => onVideoStylingToggle(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left motion-base hover:bg-muted/25">
          <span>
            <span className="text-sm font-medium text-foreground">Video styling</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Optional style hint and creative direction for analysis
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-4">
          <div className="space-y-1.5">
            <label htmlFor="dash-video-style" className="text-sm font-medium text-foreground">
              Style hint (optional)
            </label>
            <Input
              id="dash-video-style"
              placeholder="e.g. bold title, neon"
              value={videoStyle}
              onChange={(e) => onVideoStyleChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dash-video-prompt" className="text-sm font-medium text-foreground">
              Creative direction (optional)
            </label>
            <textarea
              id="dash-video-prompt"
              rows={4}
              placeholder="What should thumbnails emphasize? e.g. product close-up, shocked reaction…"
              value={videoPrompt}
              onChange={(e) => onVideoPromptChange(e.target.value)}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Used in analysis and each thumbnail (separate from the short style hint).
            </p>
          </div>
        </div>
      </details>
    </div>
  );
});
