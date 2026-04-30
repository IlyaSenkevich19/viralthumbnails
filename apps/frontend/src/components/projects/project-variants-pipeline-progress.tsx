'use client';

import { Check, Circle, ImageIcon, Loader2, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';

type ProjectVariantsPipelineProgressProps = {
  pipelineJob?: PipelineJobStatusResponse;
  pipelineBusy: boolean;
  pipelineFailed: boolean;
};

export function ProjectVariantsPipelineProgress({
  pipelineJob,
  pipelineBusy,
  pipelineFailed,
}: ProjectVariantsPipelineProgressProps) {
  const progress = pipelineJob?.progress;
  const progressAnalysis = progress?.analysis;
  const resultAnalysis = pipelineJob?.result?.analysis;
  const resultVideoAnalysis = pipelineJob?.result?.video_analysis;
  const selectedPreview =
    progressAnalysis?.selected_frame_preview_data_url ?? resultVideoAnalysis?.selectedFramePreviewDataUrl;
  const selectedFrameIndex =
    progressAnalysis?.selected_frame_index ?? readNumber(resultAnalysis, 'selectedFrameIndex');
  const selectedFrameTime =
    progressAnalysis?.selected_frame_time_sec ??
    resultVideoAnalysis?.sampledFrames?.find((frame) => frame.selected)?.timeSec;
  const selectedWhy =
    progressAnalysis?.selected_frame_why ??
    readString(resultAnalysis, 'selectedFrameWhy') ??
    readNestedString(resultAnalysis, 'bestThumbnailMoment', 'why');
  const textIdeas =
    progressAnalysis?.thumbnail_text_ideas ??
    (Array.isArray(resultAnalysis?.thumbnailTextIdeas)
      ? resultAnalysis.thumbnailTextIdeas.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : []);
  const sampledFrames =
    progressAnalysis?.sampled_frames ??
    resultVideoAnalysis?.sampledFrames?.map((frame) => ({
      frame_index: frame.frameIndex,
      time_sec: frame.timeSec,
      selected: frame.selected,
    }));
  const currentStage = progress?.stage;
  const timingByStage = new Map((progress?.timings ?? []).map((timing) => [timing.stage, timing]));
  const heroTitle = pipelineFailed
    ? 'Pipeline needs attention'
    : pipelineBusy
      ? 'Building your thumbnails'
      : pipelineJob?.status === 'succeeded'
        ? 'Analysis complete'
        : 'Ready to generate';

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-transparent bg-card/70 p-5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.025]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.055),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(255,59,59,0.13),transparent_30%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
              {pipelineBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Video pipeline
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">{heroTitle}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {progress?.label ??
                  (pipelineBusy
                    ? 'Analyzing the video, selecting a clickable moment, then generating variants.'
                    : pipelineFailed
                      ? pipelineJob?.error?.message || 'The pipeline failed.'
                      : 'Your variants will appear here.')}
              </p>
            </div>
          </div>
          {typeof progress?.percent === 'number' ? (
            <div className="rounded-2xl bg-background/35 px-4 py-3 text-right ring-1 ring-white/[0.035]">
              <p className="text-2xl font-semibold text-foreground">{progress.percent}%</p>
              <p className="text-xs text-muted-foreground">complete</p>
            </div>
          ) : null}
        </div>

        <PipelineSteps
          currentStage={currentStage}
          failed={pipelineFailed}
          timingByStage={timingByStage}
          currentElapsedMs={progress?.elapsed_ms}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
          <div className="overflow-hidden rounded-2xl bg-background/35 ring-1 ring-white/[0.035]">
            {selectedPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPreview}
                  alt="Selected video frame for thumbnail generation"
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-primary shadow-soft ring-1 ring-primary/20 backdrop-blur">
                  Selected frame
                  {selectedFrameIndex ? ` F${selectedFrameIndex}` : ''}
                  {typeof selectedFrameTime === 'number' ? ` · ${formatTime(selectedFrameTime)}` : ''}
                </div>
              </div>
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/15">
                  <ImageIcon className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {pipelineBusy ? 'Looking for the best visual moment' : 'No frame selected yet'}
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                    When the analyzer selects a frame, it will preview here before generated variants appear.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl bg-background/30 p-4 ring-1 ring-white/[0.03]">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Creative decision</p>
              <p className="text-sm font-medium text-foreground">
                {selectedFrameIndex ? `Frame ${selectedFrameIndex}` : 'Waiting for frame selection'}
                {typeof selectedFrameTime === 'number' ? ` at ${formatTime(selectedFrameTime)}` : ''}
              </p>
              {selectedWhy ? <p className="text-sm leading-relaxed text-muted-foreground">{selectedWhy}</p> : null}
            </div>

            {sampledFrames?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sampled frames</p>
                <div className="flex flex-wrap gap-1.5">
                  {sampledFrames.map((frame) => (
                    <span
                      key={`${frame.frame_index}-${frame.time_sec}`}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs ring-1',
                        frame.selected
                          ? 'bg-primary/15 text-primary ring-primary/25'
                          : 'bg-card/55 text-muted-foreground ring-white/[0.04]',
                      )}
                    >
                      F{frame.frame_index} {formatTime(frame.time_sec)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {textIdeas.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hook ideas</p>
                <div className="flex flex-wrap gap-1.5">
                  {textIdeas.map((idea) => (
                    <span
                      key={idea}
                      className="rounded-full bg-card/55 px-2.5 py-1 text-xs text-foreground ring-1 ring-white/[0.04]"
                    >
                      {idea}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineSteps({
  currentStage,
  failed,
  timingByStage,
  currentElapsedMs,
}: {
  currentStage?: string;
  failed: boolean;
  timingByStage: Map<string, { duration_ms?: number }>;
  currentElapsedMs?: number;
}) {
  const stages = [
    { id: 'queued', label: 'Queued' },
    { id: 'resolving_references', label: 'Inputs' },
    { id: 'analyzing_source', label: 'Analyze' },
    { id: 'building_prompts', label: 'Prompts' },
    { id: 'generating_images', label: 'Images' },
    { id: 'persisting_project', label: 'Save' },
    { id: 'completed', label: 'Done' },
  ];
  const currentIndex = failed
    ? -1
    : Math.max(
        0,
        stages.findIndex((stage) => stage.id === currentStage),
      );

  return (
    <ol className="grid gap-2 sm:grid-cols-7">
      {stages.map((stage, index) => {
        const complete = !failed && index < currentIndex;
        const active = !failed && index === currentIndex;
        const durationMs =
          timingByStage.get(stage.id)?.duration_ms ?? (active ? currentElapsedMs : undefined);
        return (
          <li
            key={stage.id}
            className={cn(
              'relative rounded-2xl px-2.5 py-2.5 transition-colors',
              complete && 'bg-primary/[0.07] text-primary',
              active && 'bg-primary/[0.12] text-primary shadow-soft ring-1 ring-primary/15',
              !complete && !active && 'bg-background/25 text-muted-foreground',
              failed && stage.id === currentStage && 'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
            )}
          >
            {index < stages.length - 1 ? (
              <span
                className={cn(
                  'pointer-events-none absolute left-5 top-9 h-[calc(100%-1rem)] w-px bg-white/[0.055] sm:left-[calc(50%+0.75rem)] sm:top-5 sm:h-px sm:w-[calc(100%-1.5rem)]',
                  complete && 'bg-primary/25',
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative flex items-center gap-2 sm:flex-col sm:items-start">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ring-1',
                  complete && 'bg-primary text-primary-foreground ring-primary/40',
                  active && 'bg-primary/20 ring-primary/35',
                  !complete && !active && 'bg-card/70 ring-white/[0.06]',
                )}
              >
                {complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Zap className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
              </span>
              <span className="text-xs font-medium">{stage.label}</span>
              {typeof durationMs === 'number' && durationMs >= 1000 ? (
                <span className="text-[10px] text-current/70">{formatDuration(durationMs)}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatTime(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

function readNumber(source: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = source?.[key];
  return typeof value === 'number' ? value : undefined;
}

function readString(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNestedString(
  source: Record<string, unknown> | undefined,
  objectKey: string,
  valueKey: string,
): string | undefined {
  const obj = source?.[objectKey];
  if (!obj || typeof obj !== 'object' || !(valueKey in obj)) return undefined;
  const value = (obj as Record<string, unknown>)[valueKey];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

