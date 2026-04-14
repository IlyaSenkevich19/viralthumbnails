import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';

export const OPENROUTER_CONFIG_KEY = 'openrouter' as const;

/**
 * Shared OpenRouter settings (mostly from env). Used by:
 * - `POST /projects/:id/generate`, `from-video` analyze/rank, legacy thumbnail services → `imageModel` / `videoModel` here.
 * The **modular** route `POST /thumbnails/pipeline/run` uses separate slugs in
 * `src/modules/thumbnail-pipeline/config/pipeline-step-models.ts` (VL + Flux), not these defaults for those steps.
 */
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
/** Fallback when `OPENROUTER_IMAGE_MODEL` is unset (not used for pipeline Flux gen — see pipeline-step-models). */
const DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-image-preview';
/** Fallback when `OPENROUTER_VIDEO_MODEL` is unset; also legacy `from-video` video analysis (not pipeline VL). */
const DEFAULT_VIDEO_MODEL = 'google/gemini-2.0-flash-001';
const DEFAULT_APP_TITLE = 'ViralThumblify';
const DEFAULT_PROJECT_GEN_TIMEOUT_MS = 120_000;

/**
 * When {@link OpenRouterEnvConfig.useFreeModels} is true, video analysis and ranking default to these
 * unless overridden by env. OpenRouter’s router picks a capable free model per request.
 * There is no `:free` model with image *generation* output — project thumbnails still use a normal image model.
 */
const FREE_DEFAULT_VIDEO_MODEL = 'openrouter/free';
const FREE_DEFAULT_RANKING_MODEL = 'openrouter/free';

export type OpenRouterEnvConfig = {
  apiKey: string | undefined;
  baseUrl: string;
  httpReferer: string | undefined;
  appTitle: string;
  /** When true (env `OPENROUTER_USE_FREE_MODELS`), video/ranking use free-tier defaults if not overridden. */
  useFreeModels: boolean;
  imageModel: string;
  projectGenTimeoutMs: number;
  videoModel: string;
  /** When unset, ranking uses {@link OpenRouterEnvConfig.videoModel} */
  rankingModel: string | undefined;
};

function parseUseFreeModels(): boolean {
  const v = process.env.OPENROUTER_USE_FREE_MODELS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export const openRouterConfig = registerAs(
  OPENROUTER_CONFIG_KEY,
  (): OpenRouterEnvConfig => {
    const useFreeModels = parseUseFreeModels();
    const videoModel =
      process.env.OPENROUTER_VIDEO_MODEL?.trim() ||
      (useFreeModels ? FREE_DEFAULT_VIDEO_MODEL : DEFAULT_VIDEO_MODEL);
    const rankingExplicit = process.env.OPENROUTER_RANKING_MODEL?.trim();
    const rankingModel =
      rankingExplicit ||
      (useFreeModels ? FREE_DEFAULT_RANKING_MODEL : undefined);

    const imageModel = process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

    return {
      apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
      baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER?.trim() || undefined,
      appTitle: process.env.OPENROUTER_APP_TITLE?.trim() || DEFAULT_APP_TITLE,
      useFreeModels,
      imageModel,
      projectGenTimeoutMs: (() => {
        const n = Number(process.env.OPENROUTER_PROJECT_GEN_TIMEOUT_MS);
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_PROJECT_GEN_TIMEOUT_MS;
      })(),
      videoModel,
      rankingModel,
    };
  },
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
