'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PipelineJobStatusResponse } from '@/lib/api/thumbnails';

type ProjectVariantsSourceCardProps = {
  sourceVideoUrl: string | null;
  sourceFileName: string | null;
  pipelineJob?: PipelineJobStatusResponse;
  pipelineBusy: boolean;
  pipelineFailed: boolean;
};

export function ProjectVariantsSourceCard({
  sourceVideoUrl,
  sourceFileName,
  pipelineJob,
  pipelineBusy,
  pipelineFailed,
}: ProjectVariantsSourceCardProps) {
  if (!sourceVideoUrl && !sourceFileName) {
    return null;
  }

  const progress = pipelineJob?.progress;
  const progressAnalysis = progress?.analysis;
  const resultAnalysis = pipelineJob?.result?.analysis;
  const resultVideoAnalysis = pipelineJob?.result?.video_analysis;
  const selectedPreview =
    progressAnalysis?.selected_frame_preview_data_url ?? resultVideoAnalysis?.selectedFramePreviewDataUrl;
  const selectedFrameIndex =
    progressAnalysis?.selected_frame_index ??
    readNumber(resultAnalysis, 'selectedFrameIndex');
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

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</p>
        <div className="space-y-2">
          {sourceVideoUrl ? (
            <p className="truncate text-sm text-foreground" title={sourceVideoUrl}>
              {sourceVideoUrl}
            </p>
          ) : null}
          {sourceFileName ? (
            <p className="truncate text-sm text-foreground" title={sourceFileName}>
              {sourceFileName}
            </p>
          ) : null}
          {pipelineJob ? (
            <p
              className={cn(
                'text-xs',
                pipelineBusy ? 'text-primary' : pipelineFailed ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {progress?.label ??
                (pipelineBusy
                  ? 'Analyzing source'
                  : pipelineFailed
                    ? pipelineJob.error?.message || 'Pipeline failed'
                    : 'Pipeline completed')}
            </p>
          ) : null}
        </div>

        {pipelineJob ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
            <PipelineSteps currentStage={progress?.stage} failed={pipelineFailed} />

            {selectedPreview ? (
              <img
                src={selectedPreview}
                alt="Selected video frame for thumbnail generation"
                className="aspect-video w-full rounded-lg border border-border object-cover"
              />
            ) : null}

            {selectedFrameIndex || selectedWhy ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  Selected moment
                  {selectedFrameIndex ? `: Frame ${selectedFrameIndex}` : ''}
                  {typeof selectedFrameTime === 'number' ? ` at ${formatTime(selectedFrameTime)}` : ''}
                </p>
                {selectedWhy ? <p className="text-xs leading-relaxed text-muted-foreground">{selectedWhy}</p> : null}
              </div>
            ) : null}

            {sampledFrames?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {sampledFrames.map((frame) => (
                  <span
                    key={`${frame.frame_index}-${frame.time_sec}`}
                    className={cn(
                      'rounded-full border px-2 py-1 text-[11px]',
                      frame.selected
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border bg-background/60 text-muted-foreground',
                    )}
                  >
                    F{frame.frame_index} {formatTime(frame.time_sec)}
                  </span>
                ))}
              </div>
            ) : null}

            {textIdeas.length ? (
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hook ideas</p>
                <div className="flex flex-wrap gap-1.5">
                  {textIdeas.map((idea) => (
                    <span
                      key={idea}
                      className="rounded-full border border-border bg-background/60 px-2 py-1 text-[11px] text-foreground"
                    >
                      {idea}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PipelineSteps({ currentStage, failed }: { currentStage?: string; failed: boolean }) {
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
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
      {stages.map((stage, index) => {
        const active = !failed && index <= currentIndex;
        return (
          <span
            key={stage.id}
            className={cn(
              'rounded-full px-2 py-1 text-center text-[10px] font-medium',
              active ? 'bg-primary/15 text-primary' : 'bg-background/60 text-muted-foreground',
              failed && stage.id === currentStage ? 'bg-destructive/15 text-destructive' : '',
            )}
          >
            {stage.label}
          </span>
        );
      })}
    </div>
  );
}

function formatTime(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
