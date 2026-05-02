'use client';

import { memo, useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Film, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { InfoHint } from '@/components/ui/info-hint';
import { cn } from '@/lib/utils';

type Props = {
  videoFile: File | null;
  onVideoFileChange: (file: File | null) => void;
};

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const rounded = value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} ${units[idx]}`;
}

export const VideoModePanel = memo(function VideoModePanel({ videoFile, onVideoFileChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    onVideoFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onVideoFileChange]);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      onVideoFileChange(file);
    },
    [onVideoFileChange],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <label htmlFor="dash-video-file" className="min-w-0 text-sm font-medium leading-tight text-foreground">
            Source video
          </label>
          <InfoHint
            buttonLabel="Source video tips"
            helpBody={
              <>
                <p>
                  Prefer a trimmed clip so the analyzer samples encoded frames cleanly before concepts render. Over the
                  preview, swap or remove clips using the overlay controls—they appear while hovering or focusing within
                  the player region.
                </p>
                <p className="mt-2">Supported uploads: MP4, WebM, MOV (browser-dependent codecs).</p>
              </>
            }
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <input
          ref={inputRef}
          id="dash-video-file"
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          className="sr-only"
          aria-label="Video file"
          onChange={(e) => onVideoFileChange(e.target.files?.[0] ?? null)}
        />
        {videoFile && previewUrl ? (
          <div className="space-y-2.5 rounded-2xl bg-card/25 p-3">
            <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <video
                src={previewUrl}
                muted
                playsInline
                preload="metadata"
                className="h-36 w-full object-contain"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
              <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={openPicker}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/90 transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  aria-label="Change video"
                  title="Change"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearFile}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/90 transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  aria-label="Remove video"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-3 py-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white/90">
                  <Film className="h-3 w-3" />
                  Selected video
                </span>
              </div>
            </div>
              <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground" title={videoFile.name}>
                  {videoFile.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(videoFile.size)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-6 text-center transition-colors active:scale-[0.995]',
              dragging
                ? 'border-primary/65 bg-primary/8'
                : 'border-border/45 bg-card/20 hover:border-primary/35 hover:bg-card/30',
            )}
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={handleDrop}
          >
            <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-foreground">Drop video here or click to upload</p>
          </div>
        )}
      </div>
      <div className="min-h-5" aria-hidden />
    </div>
  );
});
