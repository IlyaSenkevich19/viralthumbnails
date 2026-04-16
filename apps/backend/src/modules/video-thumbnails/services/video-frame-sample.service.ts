import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import {
  VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS,
  VIDEO_PIPELINE_FRAME_SAMPLE_COUNT,
} from '../../../config/video-pipeline.config';
import { getVideoDurationSecondsFromHttpUrl } from '../utils/video-duration-ffprobe';

const FRAME_EXTRACT_TIMEOUT_MS = 45_000;

function dataUrlFromJpegBuffer(buf: Buffer): string {
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

function computeSampleTimesWithinWindow(windowSec: number, count: number): number[] {
  const k = Math.max(1, Math.floor(count));
  const w = Math.max(0.1, windowSec);
  const times: number[] = [];
  for (let i = 0; i < k; i++) {
    const t = (w * (i + 1)) / (k + 1);
    times.push(Math.max(0, t));
  }
  return times;
}

async function extractJpegFrameAtUrl(url: string, timeSec: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(timeSec),
      '-i',
      url,
      '-frames:v',
      '1',
      '-vf',
      "scale='min(1280,iw)':-2",
      '-q:v',
      '3',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    proc.stdout?.on('data', (c: Buffer) => chunks.push(c));

    const killTimer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      resolve(null);
    }, FRAME_EXTRACT_TIMEOUT_MS);

    proc.on('error', () => {
      clearTimeout(killTimer);
      resolve(null);
    });

    proc.on('close', (code) => {
      clearTimeout(killTimer);
      if (code !== 0 || chunks.length === 0) {
        resolve(null);
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Phase 2: sample a bounded number of JPEG stills from a fetchable video URL via ffmpeg.
 * Returns [] on failure (caller falls back to native `video_url` in the VL API).
 */
@Injectable()
export class VideoFrameSampleService {
  private readonly logger = new Logger(VideoFrameSampleService.name);

  async trySampleFrames(params: {
    videoUrl: string;
    durationSeconds: number | null | undefined;
    logContext: string;
  }): Promise<string[]> {
    const url = params.videoUrl?.trim();
    if (!url) return [];

    let duration = params.durationSeconds ?? null;
    if (duration == null || !Number.isFinite(duration) || duration <= 0) {
      duration = await getVideoDurationSecondsFromHttpUrl(url);
    }
    if (duration == null || duration <= 0) {
      this.logger.debug(
        `[${params.logContext}] frame sample: could not determine duration; skipping frames`,
      );
      return [];
    }

    const windowSec = Math.min(duration, VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS);
    const times = computeSampleTimesWithinWindow(windowSec, VIDEO_PIPELINE_FRAME_SAMPLE_COUNT);
    const out: string[] = [];

    for (const t of times) {
      const buf = await extractJpegFrameAtUrl(url, t);
      if (!buf?.length) {
        this.logger.warn(
          `[${params.logContext}] frame sample failed at t=${t}s — aborting frame path`,
        );
        return [];
      }
      out.push(dataUrlFromJpegBuffer(buf));
    }

    this.logger.log(
      `[${params.logContext}] sampled ${out.length} frames (window=${windowSec.toFixed(1)}s of ${duration.toFixed(1)}s)`,
    );
    return out;
  }
}
