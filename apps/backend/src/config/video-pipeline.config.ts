import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';

export const VIDEO_PIPELINE_CONFIG_KEY = 'videoPipeline' as const;

/** Phase 0: max analyzed video length when duration is known (seconds). Tuned in code, not env. */
export const VIDEO_PIPELINE_MAX_DURATION_SECONDS = 3600; // 1 hour

/** Phase 2: only the first N seconds are sampled into still frames for VL (bounded cost). */
export const VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS = 600; // 10 minutes

/** Phase 2: number of JPEG stills sent to VL instead of raw `video_url` when extraction succeeds. */
export const VIDEO_PIPELINE_FRAME_SAMPLE_COUNT = 8;

/** Phase 2.1: minimum number of usable frames required to keep image-based VL path. */
export const VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT = 3;

/** Phase 2.1: drop frames that are too dark or too flat (very low contrast). */
export const VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS = 18; // 0..255
export const VIDEO_PIPELINE_MIN_FRAME_STDDEV = 10; // luma stddev, 0..255
export const VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY = 7; // simple blur proxy from grayscale gradients

/** Phase 2.1: treat signatures below this distance as near-duplicates. */
export const VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD = 4.5;

export type VideoPipelineEnvConfig = {
  /** Optional; enables YouTube duration checks via Data API v3 (`videos.list`). */
  youtubeDataApiKey: string | undefined;
};

export const videoPipelineConfig = registerAs(
  VIDEO_PIPELINE_CONFIG_KEY,
  (): VideoPipelineEnvConfig => ({
    youtubeDataApiKey: process.env.YOUTUBE_DATA_API_KEY?.trim() || undefined,
  }),
);

export function getVideoPipelineConfig(config: ConfigService): VideoPipelineEnvConfig {
  const v = config.get<VideoPipelineEnvConfig>(VIDEO_PIPELINE_CONFIG_KEY);
  if (!v) {
    throw new Error(
      `Config "${VIDEO_PIPELINE_CONFIG_KEY}" missing — add videoPipelineConfig to ConfigModule.forRoot({ load: [...] })`,
    );
  }
  return v;
}
