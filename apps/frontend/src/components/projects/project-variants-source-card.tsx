'use client';

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

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Source</p>
        {pipelineJob ? (
          <p
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              pipelineBusy
                ? 'border-primary/35 text-primary'
                : pipelineFailed
                  ? 'border-destructive/35 text-destructive'
                  : 'border-border text-muted-foreground',
            )}
          >
            {pipelineBusy ? 'In progress' : pipelineFailed ? 'Failed' : 'Completed'}
          </p>
        ) : null}
      </div>
      {sourceVideoUrl ? (
        <p className="truncate text-sm text-foreground/95" title={sourceVideoUrl}>
          {sourceVideoUrl}
        </p>
      ) : null}
      {sourceFileName ? (
        <p className="truncate text-sm text-foreground/95" title={sourceFileName}>
          {sourceFileName}
        </p>
      ) : null}
      {pipelineJob && (pipelineBusy || pipelineFailed) ? (
        <p
          className={cn(
            'text-xs leading-relaxed',
            pipelineBusy ? 'text-primary' : 'text-destructive',
          )}
        >
          {pipelineJob.progress?.label ??
            (pipelineBusy ? 'Analyzing source' : pipelineJob.error?.message || 'Pipeline failed')}
        </p>
      ) : null}
    </section>
  );
}

