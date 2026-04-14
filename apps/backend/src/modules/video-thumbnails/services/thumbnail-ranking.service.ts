import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../../config/openrouter.config';
import { extractJsonObject } from '@/common/json/extract-json-object';
import { OpenRouterClient } from '../../openrouter/openrouter.client';
import {
  ThumbnailScore,
  ThumbnailScoreSchema,
} from '../schemas/thumbnail-ranking.schema';
import type { GeneratedThumbnailCandidate } from './thumbnail-generation.service';
import { userContentTextThenImageUrl } from '../../openrouter/multipart-user-content';
import type { OpenRouterMessage } from '../../openrouter/openrouter.types';

export type RankedThumbnail = GeneratedThumbnailCandidate & {
  scores: ThumbnailScore;
  rank: number;
};

const RANKING_JSON = `Return ONLY valid JSON (no markdown): {"scores":{"readability":0-10,"contrast":0-10,"focalPoint":0-10,"thumbnailSuitability":0-10,"total":0-40,"notes"?:string}} where total is the sum of the four scores.`;

@Injectable()
export class ThumbnailRankingService {
  private readonly logger = new Logger(ThumbnailRankingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  rankingModel(): string {
    const or = getOpenRouterConfig(this.config);
    return or.rankingModel || or.videoModel;
  }

  async rankCandidates(candidates: GeneratedThumbnailCandidate[]): Promise<RankedThumbnail[]> {
    const model = this.rankingModel();
    const ranked: RankedThumbnail[] = [];
    let idx = 0;
    for (const c of candidates) {
      const dataUrl = `data:${c.contentType};base64,${c.buffer.toString('base64')}`;
      const messages: OpenRouterMessage[] = [
        {
          role: 'user',
          content: userContentTextThenImageUrl(
            `You are scoring a YouTube thumbnail candidate. ${RANKING_JSON}`,
            dataUrl,
          ),
        },
      ];

      let scores: ThumbnailScore = fallbackScores();
      try {
        const result = await this.openRouter.chatCompletions({
          model,
          messages,
          temperature: 0.1,
          maxTokens: 512,
        });
        this.logger.log(`rank thumbnail idx=${idx} model=${model} latencyMs=${result.latencyMs}`);
        const extracted = extractJsonObject(result.rawText);
        const parsed = JSON.parse(extracted) as unknown;
        const wrap = (parsed as { scores?: unknown })?.scores ?? parsed;
        const validated = ThumbnailScoreSchema.safeParse(wrap);
        if (validated.success) {
          scores = validated.data;
        }
      } catch (e) {
        this.logger.warn(`rank failed idx=${idx}: ${e instanceof Error ? e.message : e}`);
      }

      ranked.push({ ...c, scores, rank: 0 });
      idx += 1;
    }

    ranked.sort((a, b) => b.scores.total - a.scores.total);
    ranked.forEach((r, i) => {
      r.rank = i + 1;
    });
    return ranked;
  }
}

function fallbackScores(): ThumbnailScore {
  return {
    readability: 5,
    contrast: 5,
    focalPoint: 5,
    thumbnailSuitability: 5,
    total: 20,
    notes: 'fallback (ranking parse failed)',
  };
}
