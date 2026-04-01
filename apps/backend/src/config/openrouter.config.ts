import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';

export const OPENROUTER_CONFIG_KEY = 'openrouter' as const;

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-image-preview';
const DEFAULT_VIDEO_MODEL = 'google/gemini-2.0-flash-001';
const DEFAULT_APP_TITLE = 'ViralThumbnails';
const DEFAULT_PROJECT_GEN_TIMEOUT_MS = 120_000;

export type OpenRouterEnvConfig = {
  apiKey: string | undefined;
  baseUrl: string;
  httpReferer: string | undefined;
  appTitle: string;
  imageModel: string;
  projectGenTimeoutMs: number;
  videoModel: string;
  /** When unset, ranking uses {@link OpenRouterEnvConfig.videoModel} */
  rankingModel: string | undefined;
};

export const openRouterConfig = registerAs(
  OPENROUTER_CONFIG_KEY,
  (): OpenRouterEnvConfig => ({
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL,
    httpReferer: process.env.OPENROUTER_HTTP_REFERER?.trim() || undefined,
    appTitle: process.env.OPENROUTER_APP_TITLE?.trim() || DEFAULT_APP_TITLE,
    imageModel: process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL,
    projectGenTimeoutMs: (() => {
      const n = Number(process.env.OPENROUTER_PROJECT_GEN_TIMEOUT_MS);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_PROJECT_GEN_TIMEOUT_MS;
    })(),
    videoModel: process.env.OPENROUTER_VIDEO_MODEL?.trim() || DEFAULT_VIDEO_MODEL,
    rankingModel: process.env.OPENROUTER_RANKING_MODEL?.trim() || undefined,
  }),
);

export function getOpenRouterConfig(config: ConfigService): OpenRouterEnvConfig {
  const v = config.get<OpenRouterEnvConfig>(OPENROUTER_CONFIG_KEY);
  if (!v) {
    throw new Error(
      `Config "${OPENROUTER_CONFIG_KEY}" missing — add openRouterConfig to ConfigModule.forRoot({ load: [...] })`,
    );
  }
  return v;
}
