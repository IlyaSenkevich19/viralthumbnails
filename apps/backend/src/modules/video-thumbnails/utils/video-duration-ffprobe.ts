import { spawn } from 'node:child_process';

const FFPROBE_TIMEOUT_MS = 20_000;

/**
 * Reads container duration via ffprobe on stdin. Returns `null` if ffprobe is missing or probe fails.
 */
export async function getVideoDurationSecondsFromBuffer(buffer: Buffer): Promise<number | null> {
  if (!buffer?.length) return null;

  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      '-i',
      'pipe:0',
    ]);

    let stdout = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    const killTimer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      resolve(null);
    }, FFPROBE_TIMEOUT_MS);

    proc.on('error', () => {
      clearTimeout(killTimer);
      resolve(null);
    });

    proc.on('close', (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      const n = Number.parseFloat(stdout.trim());
      resolve(Number.isFinite(n) && n > 0 ? n : null);
    });

    proc.stdin.write(buffer);
    proc.stdin.end();
  });
}

/**
 * Reads container duration via ffprobe on an HTTP(S) URL. Returns `null` if ffprobe is missing or probe fails.
 */
export async function getVideoDurationSecondsFromHttpUrl(url: string): Promise<number | null> {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      '-i',
      trimmed,
    ]);

    let stdout = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    const killTimer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      resolve(null);
    }, FFPROBE_TIMEOUT_MS);

    proc.on('error', () => {
      clearTimeout(killTimer);
      resolve(null);
    });

    proc.on('close', (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      const n = Number.parseFloat(stdout.trim());
      resolve(Number.isFinite(n) && n > 0 ? n : null);
    });
  });
}
