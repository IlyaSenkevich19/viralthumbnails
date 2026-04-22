import { memo } from 'react';
import type { PipelineVideoResponse } from '@/lib/types/pipeline-video';

type Props = { result: PipelineVideoResponse };

export const VideoResultGrid = memo(function VideoResultGrid({ result }: Props) {
  if (!result.thumbnails.length) return null;
  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-foreground">Results</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Run <span className="font-mono text-[11px]">{result.runId}</span>
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.thumbnails.map((t, i) => (
          <li
            key={`${t.storagePath}-${t.rank}`}
            style={{ animationDelay: `${Math.min(i, 24) * 42}ms` }}
            className="vt-variant-enter overflow-hidden rounded-lg border border-border bg-background"
          >
            <a href={t.signedUrl} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.signedUrl}
                alt=""
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
            </a>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground">#{t.rank}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{t.prompt}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});
