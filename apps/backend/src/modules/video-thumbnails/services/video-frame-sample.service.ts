import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS,
  VIDEO_PIPELINE_CACHE_MAX_ENTRIES,
  VIDEO_PIPELINE_CACHE_TTL_MS,
  VIDEO_PIPELINE_FRAME_CANDIDATE_COUNT,
  VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD,
  VIDEO_PIPELINE_FRAME_MAX_WIDTH_PX,
  VIDEO_PIPELINE_FRAME_SAMPLE_COUNT,
  VIDEO_PIPELINE_FRAME_START_OFFSET_SECONDS,
  VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS,
  VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY,
  VIDEO_PIPELINE_MIN_FRAME_STDDEV,
  VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT,
} from '../../../config/video-pipeline.config';
import { getVideoDurationSecondsFromHttpUrl } from '../utils/video-duration-ffprobe';
import type { ResolvedDirectVideoSource } from './yt-dlp-video-source.service';
import { YtDlpVideoSourceService } from './yt-dlp-video-source.service';

const FRAME_EXTRACT_TIMEOUT_MS = 45_000;
const SIGNATURE_SIZE = 32;
const MIN_TIME_SEC = Math.max(0.05, VIDEO_PIPELINE_FRAME_START_OFFSET_SECONDS);

export type VideoFrameSampleSource = 'direct_url' | 'yt_dlp_stream';

export type VideoFrameSampleCandidate = {
  /** 1-based index matching the order sent to the VL model. */
  frameIndex: number;
  timeSec: number;
  dataUrl: string;
  source?: VideoFrameSampleSource;
  qualityScore?: number;
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

function ffmpegHeaderArgs(headers?: Record<string, string>): string[] {
  if (!headers || Object.keys(headers).length === 0) return [];
  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key.replace(/[\r\n:]/g, '')}: ${value.replace(/[\r\n]/g, ' ')}`)
    .join('\r\n');
  return ['-headers', `${headerText}\r\n`];
}

async function extractJpegFrameAtUrl(
  url: string,
  timeSec: number,
  headers?: Record<string, string>,
): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(timeSec),
      ...ffmpegHeaderArgs(headers),
      '-i',
      url,
      '-frames:v',
      '1',
      '-vf',
      `scale='min(${VIDEO_PIPELINE_FRAME_MAX_WIDTH_PX},iw)':-2`,
      '-q:v',
      '6',
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
  colorfulness: number;
  vector: Uint8Array;
};

async function extractFrameSignatureAtUrl(
  url: string,
  timeSec: number,
  headers?: Record<string, string>,
): Promise<FrameSignature | null> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(timeSec),
      ...ffmpegHeaderArgs(headers),
      '-i',
      url,
      '-frames:v',
      '1',
      '-vf',
      `scale=${SIGNATURE_SIZE}:${SIGNATURE_SIZE}:flags=fast_bilinear,format=rgb24`,
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
      if (buf.length < SIGNATURE_SIZE * SIGNATURE_SIZE * 3) {
        resolve(null);
        return;
      }

      let sum = 0;
      let saturationSum = 0;
      const luma = new Uint8Array(SIGNATURE_SIZE * SIGNATURE_SIZE);
      for (let i = 0, p = 0; i + 2 < buf.length && p < luma.length; i += 3, p++) {
        const r = buf[i] ?? 0;
        const g = buf[i + 1] ?? 0;
        const b = buf[i + 2] ?? 0;
        const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        luma[p] = y;
        sum += y;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        saturationSum += max === 0 ? 0 : (max - min) / max;
      }
      const mean = sum / luma.length;
      const colorfulness = saturationSum / luma.length;

      let sq = 0;
      for (let i = 0; i < luma.length; i++) {
        const d = luma[i] - mean;
        sq += d * d;
      }
      const stddev = Math.sqrt(sq / luma.length);
      let edgeSum = 0;
      let edgeCount = 0;
      for (let y = 0; y < SIGNATURE_SIZE; y++) {
        for (let x = 0; x < SIGNATURE_SIZE; x++) {
          const idx = y * SIGNATURE_SIZE + x;
          if (x + 1 < SIGNATURE_SIZE) {
            edgeSum += Math.abs((luma[idx] ?? 0) - (luma[idx + 1] ?? 0));
            edgeCount++;
          }
          if (y + 1 < SIGNATURE_SIZE) {
            edgeSum += Math.abs((luma[idx] ?? 0) - (luma[idx + SIGNATURE_SIZE] ?? 0));
            edgeCount++;
          }
        }
      }
      const edgeEnergy = edgeCount > 0 ? edgeSum / edgeCount : 0;

      resolve({
        hash: createHash('sha1').update(luma).digest('hex'),
        meanBrightness: mean,
        stddev,
        edgeEnergy,
        colorfulness,
        vector: luma,
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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function triangularScore(value: number, ideal: number, range: number): number {
  return clamp01(1 - Math.abs(value - ideal) / Math.max(1, range));
}

function scoreFrameCandidate(signature: FrameSignature, timeSec: number, windowSec: number): number {
  const brightness = triangularScore(signature.meanBrightness, 118, 92);
  const contrast = clamp01((signature.stddev - VIDEO_PIPELINE_MIN_FRAME_STDDEV) / 42);
  const sharpness = clamp01((signature.edgeEnergy - VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY) / 24);
  const color = clamp01(signature.colorfulness / 0.34);
  const timing = timeSec < VIDEO_PIPELINE_FRAME_START_OFFSET_SECONDS + 2 ? 0.78 : 1;
  const latePenalty = windowSec > 0 ? 1 - clamp01(timeSec / windowSec) * 0.12 : 1;

  return (
    brightness * 0.24 +
    contrast * 0.28 +
    sharpness * 0.28 +
    color * 0.14 +
    timing * 0.04 +
    latePenalty * 0.02
  );
}

function selectBestFrameCandidates(
  candidates: Array<VideoFrameSampleCandidate & { qualityScore: number }>,
  limit: number,
): VideoFrameSampleCandidate[] {
  const selected = [...candidates]
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, Math.max(1, limit))
    .sort((a, b) => a.timeSec - b.timeSec);

  return selected.map((frame, index) => ({
    ...frame,
    frameIndex: index + 1,
  }));
}

/**
 * Phase 2: sample a bounded number of JPEG stills from a fetchable video URL via ffmpeg.
 * Returns [] on failure. The caller should avoid native `video_url` fallback unless explicitly
 * accepted: provider-side video tokens can dominate MVP COGS.
 */
@Injectable()
export class VideoFrameSampleService {
  private readonly logger = new Logger(VideoFrameSampleService.name);
  private readonly cache = new Map<
    string,
    { expiresAt: number; frames: Array<{ dataUrl: string; timeSec: number; source: VideoFrameSampleSource }> }
  >();

  constructor(private readonly ytDlp: YtDlpVideoSourceService) {}

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
    const cacheKey = `${url}|dur=${params.durationSeconds ?? 'na'}|w=${VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS}|k=${VIDEO_PIPELINE_FRAME_SAMPLE_COUNT}|cand=${VIDEO_PIPELINE_FRAME_CANDIDATE_COUNT}|start=${VIDEO_PIPELINE_FRAME_START_OFFSET_SECONDS}|q=${VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS},${VIDEO_PIPELINE_MIN_FRAME_STDDEV},${VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY}|d=${VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD}`;
    const now = Date.now();
    this.pruneCache(now);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.debug(
        `[${params.logContext}] frame sample cache hit frames=${cached.frames.length}`,
      );
      return cached.frames.map((frame, index) => ({
        frameIndex: index + 1,
        timeSec: frame.timeSec,
        dataUrl: frame.dataUrl,
        source: frame.source,
      }));
    }

    let duration = this.normalizeDuration(params.durationSeconds);
    if (duration == null || !Number.isFinite(duration) || duration <= 0) {
      duration = await getVideoDurationSecondsFromHttpUrl(url);
    }

    const direct = await this.sampleUsableFramesFromUrl({
      url,
      duration,
      source: 'direct_url',
      logContext: params.logContext,
    });
    if (direct.length >= VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT) {
      this.cache.set(cacheKey, {
        expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS,
        frames: direct.map((frame) => ({ dataUrl: frame.dataUrl, timeSec: frame.timeSec, source: 'direct_url' })),
      });
      return direct;
    }

    const resolved = await this.ytDlp.tryResolveDirectVideoUrl(url, params.logContext);
    if (!resolved) {
      this.logger.log(
        `[${params.logContext}] frame path rejected: usable=${direct.length} < min=${VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT}; yt-dlp stream unavailable`,
      );
      return [];
    }

    let streamDuration = duration;
    if (streamDuration == null || streamDuration <= 0) {
      streamDuration = await getVideoDurationSecondsFromHttpUrl(resolved.url);
    }

    const viaYtDlp = await this.sampleUsableFramesFromUrl({
      sourceUrl: resolved,
      duration: streamDuration,
      source: 'yt_dlp_stream',
      logContext: params.logContext,
    });
    if (viaYtDlp.length < VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT) {
      this.logger.log(
        `[${params.logContext}] frame path rejected after yt-dlp: usable=${viaYtDlp.length} < min=${VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT}`,
      );
      return [];
    }

    this.cache.set(cacheKey, {
      expiresAt: now + VIDEO_PIPELINE_CACHE_TTL_MS,
      frames: viaYtDlp.map((frame) => ({
        dataUrl: frame.dataUrl,
        timeSec: frame.timeSec,
        source: 'yt_dlp_stream',
      })),
    });
    return viaYtDlp;
  }

  private async sampleUsableFramesFromUrl(params: {
    url?: string;
    sourceUrl?: ResolvedDirectVideoSource;
    duration: number | null;
    source: VideoFrameSampleSource;
    logContext: string;
  }): Promise<VideoFrameSampleCandidate[]> {
    const url = params.sourceUrl?.url ?? params.url;
    if (!url) return [];

    if (params.duration == null || params.duration <= 0) {
      this.logger.debug(
        `[${params.logContext}] frame sample ${params.source}: could not determine duration; skipping frames`,
      );
      return [];
    }

    const windowSec = Math.min(params.duration, VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS);
    const times = buildCandidateTimes(windowSec, VIDEO_PIPELINE_FRAME_CANDIDATE_COUNT);
    const candidates: Array<VideoFrameSampleCandidate & { qualityScore: number }> = [];
    const acceptedSignatures: FrameSignature[] = [];
    let droppedLowQuality = 0;
    let droppedDuplicates = 0;
    let extractionFailures = 0;

    for (const t of times) {
      const buf = await extractJpegFrameAtUrl(url, t, params.sourceUrl?.headers);
      if (!buf?.length) {
        extractionFailures++;
        continue;
      }

      const signature = await extractFrameSignatureAtUrl(url, t, params.sourceUrl?.headers);
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
      candidates.push({
        frameIndex: 0,
        timeSec: t,
        dataUrl: dataUrlFromJpegBuffer(buf),
        source: params.source,
        qualityScore: scoreFrameCandidate(signature, t, windowSec),
      });
    }

    const out = selectBestFrameCandidates(candidates, VIDEO_PIPELINE_FRAME_SAMPLE_COUNT);

    if (out.length < VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT) {
      this.logger.log(
        `[${params.logContext}] frame path ${params.source} rejected: usable=${out.length} < min=${VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT} (candidateTimes=${times.length}, scored=${candidates.length}, droppedLowQuality=${droppedLowQuality}, droppedDuplicates=${droppedDuplicates}, extractionFailures=${extractionFailures})`,
      );
      return [];
    }

    this.logger.log(
      `[${params.logContext}] selected ${out.length}/${candidates.length} scored frames via ${params.source} (candidateTimes=${times.length}, window=${windowSec.toFixed(1)}s of ${params.duration.toFixed(1)}s, droppedLowQuality=${droppedLowQuality}, droppedDuplicates=${droppedDuplicates}, extractionFailures=${extractionFailures}, scores=${out.map((frame) => frame.qualityScore?.toFixed(2)).join(',')})`,
    );
    return out;
  }

  private normalizeDuration(durationSeconds: number | null | undefined): number | null {
    return typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : null;
  }
}
