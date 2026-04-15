import { Injectable, Logger } from '@nestjs/common';
import { PIPELINE_STEP_MODELS } from '../../../config/openrouter-models';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import { requestPipelineTextRefinement } from '../../openrouter/openrouter-requests';

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

    try {
      const result = await requestPipelineTextRefinement(this.openRouter, {
        model,
        userDirection: direction,
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
