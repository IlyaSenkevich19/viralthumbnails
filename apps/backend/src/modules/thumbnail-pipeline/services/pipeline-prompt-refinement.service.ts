import { Injectable, Logger } from '@nestjs/common';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

/**
 * Optional text-only step: tighten creator direction before VL / image steps.
 * Skipped when {@link PIPELINE_STEP_MODELS.textRefinement} is unset.
 */
@Injectable()
export class PipelinePromptRefinementService {
  private readonly logger = new Logger(PipelinePromptRefinementService.name);

  constructor(private readonly openRouter: OpenRouterClient) {}

  async refineIfConfigured(direction: string): Promise<{ text: string; model?: string }> {
    const model = PIPELINE_STEP_MODELS.textRefinement?.trim();
    if (!model) {
      return { text: direction };
    }
    if (!this.openRouter.getApiKey()) {
      return { text: direction };
    }

    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content:
          'You are a YouTube thumbnail creative director. Rewrite the creator notes into 3-6 short imperative lines (angles, emotion, text on thumbnail, what to avoid). Plain text only, no JSON.',
      },
      { role: 'user', content: direction.slice(0, 8000) },
    ];

    try {
      const result = await this.openRouter.chatCompletions({
        model,
        messages,
        temperature: 0.35,
        maxTokens: 1024,
      });
      const refined = result.rawText.trim();
      if (!refined) return { text: direction };
      this.logger.log(`Prompt refinement model=${model} latencyMs=${result.latencyMs}`);
      return {
        text: `${direction.trim()}\n\n[Refined director notes]\n${refined.slice(0, 1500)}`,
        model,
      };
    } catch (e) {
      this.logger.warn(
        `Prompt refinement skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { text: direction };
    }
  }
}
