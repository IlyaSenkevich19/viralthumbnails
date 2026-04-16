import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';

export const VIDEO_PIPELINE_CONFIG_KEY = 'videoPipeline' as const;

/** Phase 0: max analyzed video length when duration is known (seconds). Tuned in code, not env. */
export const VIDEO_PIPELINE_MAX_DURATION_SECONDS = 3600; // 1 hour

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
