import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import {
  VIDEO_PIPELINE_YT_DLP_BINARY,
  VIDEO_PIPELINE_YT_DLP_FORMAT,
  VIDEO_PIPELINE_YT_DLP_TIMEOUT_MS,
} from '../../../config/video-pipeline.config';

const MAX_STDOUT_CHARS = 5_000_000;

export type ResolvedDirectVideoSource = {
  url: string;
  headers?: Record<string, string>;
};

@Injectable()
export class YtDlpVideoSourceService {
  private readonly logger = new Logger(YtDlpVideoSourceService.name);

  async tryResolveDirectVideoUrl(rawUrl: string, logContext: string): Promise<ResolvedDirectVideoSource | null> {
    const url = rawUrl?.trim();
    if (!url) return null;

    return new Promise((resolve) => {
      const proc = spawn(VIDEO_PIPELINE_YT_DLP_BINARY, [
        '--no-playlist',
        '--no-warnings',
        '--dump-single-json',
        '-f',
        VIDEO_PIPELINE_YT_DLP_FORMAT,
        url,
      ]);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
        if (stdout.length > MAX_STDOUT_CHARS) stdout = stdout.slice(0, MAX_STDOUT_CHARS);
      });
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        if (stderr.length > MAX_STDOUT_CHARS) stderr = stderr.slice(0, MAX_STDOUT_CHARS);
      });

      const killTimer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
        this.logger.warn(`[${logContext}] yt-dlp timed out after ${VIDEO_PIPELINE_YT_DLP_TIMEOUT_MS}ms`);
        resolve(null);
      }, VIDEO_PIPELINE_YT_DLP_TIMEOUT_MS);

      proc.on('error', (error) => {
        clearTimeout(killTimer);
        this.logger.warn(`[${logContext}] yt-dlp unavailable or failed to start: ${error.message}`);
        resolve(null);
      });

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        if (code !== 0) {
          const message = stderr.trim().split('\n').slice(-1)[0] || `exit=${code}`;
          this.logger.warn(`[${logContext}] yt-dlp stream resolve failed: ${message}`);
          resolve(null);
          return;
        }

        const direct = this.extractDirectSource(stdout);

        if (!direct) {
          this.logger.warn(`[${logContext}] yt-dlp returned no direct video URL`);
          resolve(null);
          return;
        }

        this.logger.log(`[${logContext}] yt-dlp resolved direct video stream`);
        resolve(direct);
      });
    });
  }

  private extractDirectSource(rawJson: string): ResolvedDirectVideoSource | null {
    try {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const rootHeaders = readStringRecord(parsed.http_headers);
      const requested = Array.isArray(parsed.requested_formats) ? parsed.requested_formats : [];
      for (const item of requested) {
        if (!item || typeof item !== 'object') continue;
        const format = item as Record<string, unknown>;
        const url = typeof format.url === 'string' ? format.url.trim() : '';
        const vcodec = typeof format.vcodec === 'string' ? format.vcodec : '';
        if (!url || !/^https?:\/\//i.test(url) || vcodec === 'none') continue;
        return {
          url,
          headers: readStringRecord(format.http_headers) ?? rootHeaders,
        };
      }

      const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
      if (/^https?:\/\//i.test(url)) {
        return { url, headers: rootHeaders };
      }
    } catch (error) {
      this.logger.warn(`yt-dlp JSON parse failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' && raw.trim()) out[key] = raw;
  }
  return Object.keys(out).length ? out : undefined;
}
