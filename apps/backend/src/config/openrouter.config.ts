import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';
import { OPENROUTER_FREE_ROUTER, OPENROUTER_STACK } from './openrouter-models';

export const OPENROUTER_CONFIG_KEY = 'openrouter' as const;

export type OpenRouterEnvConfig = {
  apiKey: string | undefined;
  baseUrl: string;
  /** Prefer `FRONTEND_URL` at process load for OpenRouter `HTTP-Referer`. */
  httpReferer: string | undefined;
  appTitle: string;
  imageModel: string;
  projectGenTimeoutMs: number;
  videoModel: string;
  /** When unset at runtime, ranking uses {@link OpenRouterEnvConfig.videoModel}. */
  rankingModel: string | undefined;
};

export const openRouterConfig = registerAs(
  OPENROUTER_CONFIG_KEY,
  (): OpenRouterEnvConfig => {
    const useFree = OPENROUTER_STACK.useFreeTierForVideoAndRanking;
    const videoModel = useFree ? OPENROUTER_FREE_ROUTER : OPENROUTER_STACK.videoModel;
    const rankingModel = useFree
      ? OPENROUTER_FREE_ROUTER
      : OPENROUTER_STACK.rankingModel?.trim() || undefined;

    return {
      apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
      baseUrl: OPENROUTER_STACK.baseUrl,
      httpReferer: process.env.FRONTEND_URL?.trim() || undefined,
      appTitle: OPENROUTER_STACK.appTitle,
      imageModel: OPENROUTER_STACK.imageModel,
      projectGenTimeoutMs: OPENROUTER_STACK.projectGenTimeoutMs,
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
