import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS,
  VIDEO_PIPELINE_CACHE_MAX_ENTRIES,
  VIDEO_PIPELINE_CACHE_TTL_MS,
  VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD,
  VIDEO_PIPELINE_FRAME_SAMPLE_COUNT,
  VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS,
  VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY,
  VIDEO_PIPELINE_MIN_FRAME_STDDEV,
  VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT,
} from '../../../config/video-pipeline.config';
import { getVideoDurationSecondsFromHttpUrl } from '../utils/video-duration-ffprobe';

const FRAME_EXTRACT_TIMEOUT_MS = 45_000;
const SIGNATURE_SIZE = 32;
const MIN_TIME_SEC = 0.05;

export type VideoFrameSampleCandidate = {
  /** 1-based index matching the order sent to the VL model. */
  frameIndex: number;
  timeSec: number;
  dataUrl: string;
};

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

function buildCandidateTimes(windowSec: number, count: number): number[] {
  const primary = computeSampleTimesWithinWindow(windowSec, count);
  const k = Math.max(1, Math.floor(count));
  const secondary: number[] = [];
  for (let i = 0; i < k; i++) {
    secondary.push((windowSec * (i + 0.5)) / k);
  }
  const maxTime = Math.max(MIN_TIME_SEC, windowSec - MIN_TIME_SEC);
  const seen = new Set<string>();
  const out: number[] = [];
  for (const raw of [...primary, ...secondary]) {
    const clamped = Math.min(maxTime, Math.max(MIN_TIME_SEC, raw));
    const key = clamped.toFixed(3);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clamped);
  }
  return out;
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

type FrameSignature = {
  hash: string;
  meanBrightness: number;
  stddev: number;
  edgeEnergy: number;
  vector: Uint8Array;
};

async function extractFrameSignatureAtUrl(url: string, timeSec: number): Promise<FrameSignature | null> {
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
      `scale=${SIGNATURE_SIZE}:${SIGNATURE_SIZE}:flags=fast_bilinear,format=gray`,
      '-f',
      'rawvideo',
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
      const buf = Buffer.concat(chunks);
      if (buf.length < SIGNATURE_SIZE * SIGNATURE_SIZE) {
        resolve(null);
        return;
      }

      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const mean = sum / buf.length;

      let sq = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = buf[i] - mean;
        sq += d * d;
      }
      const stddev = Math.sqrt(sq / buf.length);
      let edgeSum = 0;
      let edgeCount = 0;
      for (let y = 0; y < SIGNATURE_SIZE; y++) {
        for (let x = 0; x < SIGNATURE_SIZE; x++) {
          const idx = y * SIGNATURE_SIZE + x;
          if (x + 1 < SIGNATURE_SIZE) {
            edgeSum += Math.abs(buf[idx] - buf[idx + 1]);
            edgeCount++;
          }
          if (y + 1 < SIGNATURE_SIZE) {
            edgeSum += Math.abs(buf[idx] - buf[idx + SIGNATURE_SIZE]);
            edgeCount++;
          }
        }
      }
      const edgeEnergy = edgeCount > 0 ? edgeSum / edgeCount : 0;

      resolve({
        hash: createHash('sha1').update(buf).digest('hex'),
        meanBrightness: mean,
        stddev,
        edgeEnergy,
        vector: new Uint8Array(buf),
      });
    });
  });
}

function signatureDistance(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 255;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / n;
}

/**
 * Phase 2: sample a bounded number of JPEG stills from a fetchable video URL via ffmpeg.
 * Returns [] on failure (caller falls back to native `video_url` in the VL API).
 */
@Injectable()
export class VideoFrameSampleService {
  private readonly logger = new Logger(VideoFrameSampleService.name);
  private readonly cache = new Map<string, { expiresAt: number; frames: string[] }>();

  private pruneCache(now: number): void {
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt <= now) this.cache.delete(k);
    }
    while (this.cache.size > VIDEO_PIPELINE_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.cache.delete(oldest);
    }
  }

  async trySampleFrames(params: {
    videoUrl: string;
    durationSeconds: number | null | undefined;
    logContext: string;
  }): Promise<string[]> {
    const candidates = await this.trySampleFrameCandidates(params);
    return candidates.map((frame) => frame.dataUrl);
  }

  async trySampleFrameCandidates(params: {
    videoUrl: string;
    durationSeconds: number | null | undefined;
    logContext: string;
  }): Promise<VideoFrameSampleCandidate[]> {
    const url = params.videoUrl?.trim();
    if (!url) return [];
    const cacheKey = `${url}|dur=${params.durationSeconds ?? 'na'}|w=${VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS}|k=${VIDEO_PIPELINE_FRAME_SAMPLE_COUNT}|q=${VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS},${VIDEO_PIPELINE_MIN_FRAME_STDDEV},${VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY}|d=${VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD}`;
    const now = Date.now();
    this.pruneCache(now);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug(
        `[${params.logContext}] frame sample cache hit frames=${cached.frames.length}`,
      );
      return cached.frames.map((dataUrl, index) => ({
        frameIndex: index + 1,
        timeSec: this.estimateCachedFrameTime(index, cached.frames.length, params.durationSeconds),
        dataUrl,
      }));
    }

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
    const times = buildCandidateTimes(windowSec, VIDEO_PIPELINE_FRAME_SAMPLE_COUNT);
    const out: VideoFrameSampleCandidate[] = [];
    const acceptedSignatures: FrameSignature[] = [];
    let droppedLowQuality = 0;
    let droppedDuplicates = 0;
    let extractionFailures = 0;

    for (const t of times) {
      if (out.length >= VIDEO_PIPELINE_FRAME_SAMPLE_COUNT) break;
      const buf = await extractJpegFrameAtUrl(url, t);
      if (!buf?.length) {
        extractionFailures++;
        continue;
      }

      const signature = await extractFrameSignatureAtUrl(url, t);
      if (!signature) {
        extractionFailures++;
        continue;
      }

      if (
        signature.meanBrightness < VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS ||
        signature.stddev < VIDEO_PIPELINE_MIN_FRAME_STDDEV ||
        signature.edgeEnergy < VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY
      ) {
        droppedLowQuality++;
        continue;
      }

      const isDuplicate = acceptedSignatures.some(
        (prev) =>
          prev.hash === signature.hash ||
          signatureDistance(prev.vector, signature.vector) <=
            VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD,
      );
      if (isDuplicate) {
        droppedDuplicates++;
        continue;
      }

      acceptedSignatures.push(signature);
      out.push({
        frameIndex: out.length + 1,
        timeSec: t,
        dataUrl: dataUrlFromJpegBuffer(buf),
      });
    }

    if (out.length < VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT) {
      this.logger.log(
        `[${params.logContext}] frame path rejected: usable=${out.length} < min=${VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT} (candidates=${times.length}, droppedLowQuality=${droppedLowQuality}, droppedDuplicates=${droppedDuplicates}, extractionFailures=${extractionFailures})`,
      );
      return [];
    }

    this.logger.log(
      `[${params.logContext}] sampled ${out.length}/${times.length} usable frames (window=${windowSec.toFixed(1)}s of ${duration.toFixed(1)}s, droppedLowQuality=${droppedLowQuality}, droppedDuplicates=${droppedDuplicates}, extractionFailures=${extractionFailures})`,
    );
    this.cache.set(cacheKey, { expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS, frames: out.map((frame) => frame.dataUrl) });
    return out;
  }

  private estimateCachedFrameTime(index: number, count: number, durationSeconds: number | null | undefined): number {
    const duration =
      typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
        ? durationSeconds
        : VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS;
    const windowSec = Math.min(duration, VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS);
    return computeSampleTimesWithinWindow(windowSec, count)[index] ?? 0;
  }
}
