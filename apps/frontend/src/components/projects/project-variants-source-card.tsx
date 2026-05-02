'use client';

import { InfoHint } from '@/components/ui/info-hint';
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
          <p className="shrink-0 text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-muted-foreground">
            Source
          </p>
          <InfoHint
            buttonLabel="About the Source summary"
            helpBody={
              <p>Shows whichever file upload or ingest URL seeded this studio project—immutable reference only.</p>
            }
          />
        </div>
        {pipelineJob ? (
          <p
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
              pipelineBusy
                ? 'border-primary/35 text-primary'
                : pipelineFailed
                  ? 'border-warning/40 text-warning ring-1 ring-warning/15'
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
            pipelineBusy ? 'text-primary' : 'text-warning',
          )}
        >
          {pipelineJob.progress?.label ??
            (pipelineBusy ? 'Analyzing source' : pipelineJob.error?.message || 'Pipeline failed')}
        </p>
      ) : null}
    </section>
  );
}

