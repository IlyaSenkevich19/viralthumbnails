import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';
import { OPENROUTER_STACK } from './openrouter-models';

export const OPENROUTER_CONFIG_KEY = 'openrouter' as const;

export type OpenRouterEnvConfig = {
  apiKey: string | undefined;
  baseUrl: string;
  /** Prefer `FRONTEND_URL` at process load for OpenRouter `HTTP-Referer`. */
  httpReferer: string | undefined;
  appTitle: string;
  projectGenTimeoutMs: number;
};

export const openRouterConfig = registerAs(
  OPENROUTER_CONFIG_KEY,
  (): OpenRouterEnvConfig => ({
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
    baseUrl: OPENROUTER_STACK.baseUrl,
    httpReferer: process.env.FRONTEND_URL?.trim() || undefined,
    appTitle: OPENROUTER_STACK.appTitle,
    projectGenTimeoutMs: OPENROUTER_STACK.projectGenTimeoutMs,
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
