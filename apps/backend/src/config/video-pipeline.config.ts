import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';

export const VIDEO_PIPELINE_CONFIG_KEY = 'videoPipeline' as const;

/** Phase 0: max analyzed video length when duration is known (seconds). Tuned in code, not env. */
export const VIDEO_PIPELINE_MAX_DURATION_SECONDS = 3600; // 1 hour

/** Phase 2: only the first N seconds are sampled into still frames for VL (bounded cost). */
export const VIDEO_PIPELINE_ANALYZE_WINDOW_SECONDS = 240; // 4 minutes

/** Phase 2: number of JPEG stills sent to VL. Keep low: image/video tokens dominate COGS. */
export const VIDEO_PIPELINE_FRAME_SAMPLE_COUNT = 4;

/** Phase 2: maximum width for sampled VL frames. Thumbnail strategy does not need 1280px inputs. */
export const VIDEO_PIPELINE_FRAME_MAX_WIDTH_PX = 640;

/** Phase 2.1: minimum number of usable frames required to keep image-based VL path. */
export const VIDEO_PIPELINE_MIN_USABLE_FRAME_COUNT = 2;

/** Phase 2.1: drop frames that are too dark or too flat (very low contrast). */
export const VIDEO_PIPELINE_MIN_FRAME_BRIGHTNESS = 18; // 0..255
export const VIDEO_PIPELINE_MIN_FRAME_STDDEV = 10; // luma stddev, 0..255
export const VIDEO_PIPELINE_MIN_FRAME_EDGE_ENERGY = 7; // simple blur proxy from grayscale gradients

/** Phase 2.1: treat signatures below this distance as near-duplicates. */
export const VIDEO_PIPELINE_FRAME_DEDUP_DISTANCE_THRESHOLD = 4.5;

/** Phase 4: in-memory cache for frame sampling and transcript snippets. */
export const VIDEO_PIPELINE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
export const VIDEO_PIPELINE_CACHE_MAX_ENTRIES = 200;

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
