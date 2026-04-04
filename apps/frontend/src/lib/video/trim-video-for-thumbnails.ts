import { VIDEO_ANALYSIS_MAX_SECONDS, VIDEO_TRIM_MAX_INPUT_BYTES } from '@/lib/video/clip-limits';

export class TrimVideoError extends Error {
  constructor(
    message: string,
    public readonly code: 'FILE_TOO_LARGE' | 'DURATION_UNKNOWN' | 'TRIM_FAILED',
  ) {
    super(message);
    this.name = 'TrimVideoError';
  }
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  if (i <= 0 || i === name.length - 1) return '.mp4';
  return name.slice(i).toLowerCase();
}

export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const done = (sec: number) => {
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new TrimVideoError('Could not read video duration.', 'DURATION_UNKNOWN'));
    };
    v.onloadedmetadata = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) {
        fail();
        return;
      }
      done(d);
    };
    v.onerror = fail;
    v.src = url;
  });
}

function asVideoBytes(data: Uint8Array | string): Uint8Array {
  if (data instanceof Uint8Array) return data;
  throw new TrimVideoError('Unexpected ffmpeg output format.', 'TRIM_FAILED');
}

/** Copy into a fresh buffer so `File` accepts the part (TS / BlobPart typing). */
function asBlobPart(bytes: Uint8Array): BlobPart {
  return new Uint8Array(bytes);
}

let ffmpegLoadPromise: Promise<import('@ffmpeg/ffmpeg').FFmpeg> | null = null;

async function getLoadedFfmpeg(): Promise<import('@ffmpeg/ffmpeg').FFmpeg> {
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

/**
 * If the file is longer than `maxSeconds`, returns a new File with only the first segment (ffmpeg, stream copy when possible).
 * Shorter files are returned unchanged. Remote URLs are not handled here.
 */
export async function maybeTrimVideoForThumbnails(
  file: File,
  options?: { maxSeconds?: number; maxInputBytes?: number },
): Promise<File> {
  const maxSeconds = options?.maxSeconds ?? VIDEO_ANALYSIS_MAX_SECONDS;
  const maxInputBytes = options?.maxInputBytes ?? VIDEO_TRIM_MAX_INPUT_BYTES;

  let duration: number;
  try {
    duration = await getVideoDurationSeconds(file);
  } catch (e) {
    if (e instanceof TrimVideoError) throw e;
    throw new TrimVideoError('Could not read video duration.', 'DURATION_UNKNOWN');
  }

  if (duration <= maxSeconds) {
    return file;
  }

  if (file.size > maxInputBytes) {
    throw new TrimVideoError(
      'This file is too large to trim in the browser. Please upload a shorter recording (under ~5 minutes or a smaller file), or use a direct HTTPS link to the video.',
      'FILE_TOO_LARGE',
    );
  }

  const ffmpeg = await getLoadedFfmpeg();
  const ext = fileExtension(file.name);
  const inputName = `input${ext}`;
  const outputName = `out${ext}`;

  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  const { fetchFile } = await import('@ffmpeg/util');
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = ['-i', inputName, '-t', String(maxSeconds), '-c', 'copy', outputName];
  try {
    await ffmpeg.exec(args);
  } catch {
    await ffmpeg.deleteFile(outputName).catch(() => {});
    const fallback = [
      '-i',
      inputName,
      '-t',
      String(maxSeconds),
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '28',
      '-an',
      'out.mp4',
    ];
    try {
      await ffmpeg.exec(fallback);
    } catch {
      await ffmpeg.deleteFile(inputName).catch(() => {});
      throw new TrimVideoError(
        'Could not trim this video in the browser. Try another format (MP4) or a shorter clip.',
        'TRIM_FAILED',
      );
    }
    const data = await ffmpeg.readFile('out.mp4');
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile('out.mp4').catch(() => {});
    const u8 = asVideoBytes(data);
    const base = file.name.replace(/\.[^.]+$/, '') || 'video';
    return new File([asBlobPart(u8)], `${base}-first-${Math.round(maxSeconds / 60)}min.mp4`, {
      type: 'video/mp4',
    });
  }

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  const u8 = asVideoBytes(data);
  const base = file.name.replace(/\.[^.]+$/, '') || 'video';
  const outMime =
    ext === '.webm'
      ? 'video/webm'
      : ext === '.mov' || ext === '.qt'
        ? 'video/quicktime'
        : 'video/mp4';
  return new File([asBlobPart(u8)], `${base}-first-${Math.round(maxSeconds / 60)}min${ext}`, {
    type: outMime,
  });
}
