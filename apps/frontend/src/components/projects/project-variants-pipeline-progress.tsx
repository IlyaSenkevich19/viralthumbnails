'use client';

import { Check, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { vtSpring } from '@/lib/motion-presets';
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
  const reduceMotion = useReducedMotion();
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
  const frameExtractionMode =
    progressAnalysis?.frame_extraction_mode ?? resultVideoAnalysis?.frameExtractionMode;
  const frameModeLabel =
    frameExtractionMode === 'yt_dlp_stream'
      ? 'Real YouTube frames'
      : frameExtractionMode === 'direct_url'
        ? 'Real video frames'
        : frameExtractionMode === 'text_context_no_video_url'
          ? 'Text context only'
          : 'Frame extraction pending';
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
  const activeStepLabel = stageToSimpleStep(currentStage);
  const heroTitle = pipelineFailed
    ? 'Pipeline needs attention'
    : pipelineBusy
      ? 'Building your thumbnails'
      : pipelineJob?.status === 'succeeded'
        ? 'Analysis complete'
        : 'Ready to generate';

  return (
    <motion.div
      className="relative overflow-hidden rounded-[1.75rem] border border-transparent bg-card/70 p-5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.025]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : vtSpring.enter}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.055),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(255,59,59,0.13),transparent_30%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
                {pipelineBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {activeStepLabel}
              </div>
              <div
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1',
                  frameExtractionMode === 'text_context_no_video_url'
                    ? 'bg-warning/10 text-warning ring-warning/20'
                    : frameExtractionMode
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/15'
                      : 'bg-white/[0.045] text-muted-foreground ring-white/[0.04]',
                )}
              >
                {frameModeLabel}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">{heroTitle}</h3>
              <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                {progress?.label ??
                  (pipelineBusy
                    ? 'Analyzing the video, selecting a clickable moment, then generating variants.'
                    : pipelineFailed
                      ? pipelineJob?.error?.message || 'The pipeline failed.'
                      : 'Your variants will appear here.')}
              </p>
            </div>
          </div>
        </div>

        <PipelineSteps
          currentStage={currentStage}
          failed={pipelineFailed}
          timingByStage={timingByStage}
          currentElapsedMs={progress?.elapsed_ms}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
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
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What the model picked</p>
              <p className="text-sm font-medium text-foreground">
                {selectedFrameIndex ? `Frame ${selectedFrameIndex}` : 'Waiting for frame selection'}
                {typeof selectedFrameTime === 'number' ? ` at ${formatTime(selectedFrameTime)}` : ''}
              </p>
              {selectedWhy ? <p className="text-sm leading-relaxed text-muted-foreground">{selectedWhy}</p> : null}
            </div>

            {sampledFrames?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Checked {sampledFrames.length} video frame{sampledFrames.length === 1 ? '' : 's'}
                  {selectedFrameIndex ? ` and selected F${selectedFrameIndex}` : ''}.
                </p>
              </div>
            ) : null}

            {textIdeas.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Text hooks</p>
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
    </motion.div>
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
    {
      id: 'analyze',
      label: 'Analyze video',
      stages: ['queued', 'resolving_references', 'analyzing_source'],
    },
    {
      id: 'concept',
      label: 'Prepare concept',
      stages: ['building_prompts'],
    },
    {
      id: 'generate',
      label: 'Generate thumbnails',
      stages: ['generating_images', 'persisting_project', 'completed'],
    },
  ];
  const currentIndex = failed
    ? -1
    : Math.max(
        0,
        stages.findIndex((stage) => stage.stages.includes(currentStage ?? '')),
      );

  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {stages.map((stage, index) => {
        const complete = !failed && index < currentIndex;
        const active = !failed && index === currentIndex;
        const durationMs = readSimpleStepDuration(stage.stages, timingByStage) ?? (active ? currentElapsedMs : undefined);
        return (
          <li
            key={stage.id}
            className={cn(
              'relative rounded-2xl px-3 py-3 transition-colors',
              complete && 'bg-primary/[0.07] text-primary',
              active && 'bg-primary/[0.12] text-primary shadow-soft ring-1 ring-primary/15',
              !complete && !active && 'bg-background/25 text-muted-foreground',
              failed && active && 'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
            )}
          >
            {index < stages.length - 1 ? (
              <span
                className={cn(
                  'pointer-events-none absolute left-5 top-10 h-[calc(100%-1rem)] w-px bg-white/[0.055] sm:left-[calc(50%+0.75rem)] sm:top-6 sm:h-px sm:w-[calc(100%-1.5rem)]',
                  complete && 'bg-primary/25',
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative flex items-center gap-3">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] ring-1',
                  complete && 'bg-primary text-primary-foreground ring-primary/40',
                  active && 'bg-primary/20 ring-primary/35',
                  !complete && !active && 'bg-card/70 ring-white/[0.06]',
                )}
              >
                {complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current opacity-50" />
                )}
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-medium">{stage.label}</span>
                {typeof durationMs === 'number' && durationMs >= 1000 ? (
                  <span className="block text-[11px] text-current/70">{formatDuration(durationMs)}</span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function stageToSimpleStep(stage?: string): string {
  if (stage === 'generating_images' || stage === 'persisting_project' || stage === 'completed') {
    return 'Generating thumbnails';
  }
  if (stage === 'building_prompts') return 'Preparing concept';
  return 'Analyzing video';
}

function readSimpleStepDuration(
  stages: string[],
  timingByStage: Map<string, { duration_ms?: number }>,
): number | undefined {
  let total = 0;
  let found = false;
  for (const stage of stages) {
    const duration = timingByStage.get(stage)?.duration_ms;
    if (typeof duration === 'number') {
      total += duration;
      found = true;
    }
  }
  return found ? total : undefined;
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

