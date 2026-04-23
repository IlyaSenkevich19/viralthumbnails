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

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</p>
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
            {pipelineJob.progress?.label ??
              (pipelineBusy
                ? 'Analyzing source'
                : pipelineFailed
                  ? pipelineJob.error?.message || 'Pipeline failed'
                  : 'Pipeline completed')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
