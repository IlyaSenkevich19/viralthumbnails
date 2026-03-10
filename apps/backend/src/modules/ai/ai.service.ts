import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { SCORING_PROMPT, REPLY_PROMPT } from './prompts';
import type { PostInput, ScoringResponse } from './types';

@Injectable()
export class AiService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey =
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY;
    const baseURL =
      process.env.AI_BASE_URL ||
      'https://api.x.ai/v1';
    this.model = process.env.AI_MODEL || 'grok-2-1212'; // xAI model

    if (!apiKey) {
      throw new Error('AI_API_KEY or OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  /**
   * Intent scoring 0-100. Universal prompts work with xAI Grok, AIAI.BY, OpenAI.
   */
  async scoreIntent(title: string, content: string): Promise<number> {
    const post = `${title}\n\n${content}`.slice(0, 2000);
    const prompt = SCORING_PROMPT.replace('{{post}}', post);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{"score":0}';
    return this.parseScore(raw);
  }

  private parseScore(raw: string): number {
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned) as ScoringResponse;
      const score = typeof parsed.score === 'number' ? parsed.score : parseInt(String(parsed.score), 10);
      return Math.max(0, Math.min(100, isNaN(score) ? 0 : score));
    } catch {
      const match = raw.match(/\d+/);
      const n = match ? parseInt(match[0], 10) : 0;
      return Math.max(0, Math.min(100, n));
    }
  }

  /**
   * Generate natural Reddit reply. Anti-spam, human-like.
   */
  async generateReply(
    post: PostInput,
    productDescription = 'our product/service',
  ): Promise<string> {
    const postText = `${post.title}\n\n${post.content}`.slice(0, 2000);
    const prompt = REPLY_PROMPT.replace('{{post}}', postText)
      .replace('{{product}}', productDescription);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  /** Backward compat: alias for scoreIntent */
  async scorePost(title: string, content: string): Promise<number> {
    return this.scoreIntent(title, content);
  }
}
