import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import { OpenRouterClient } from '../openrouter/openrouter.client';
import type { OpenRouterMessage } from '../openrouter/openrouter.types';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BUCKET_PROJECT_THUMBNAILS,
  StorageService,
} from '../storage/storage.service';

export interface GenerateThumbnailResult {
  variantId: string;
  imageUrl: string | null;
  /** Set when file was stored in Supabase Storage (same as DB column). */
  storagePath?: string | null;
  status: 'done' | 'failed';
  errorMessage?: string;
}

type GeneratedImage =
  | { kind: 'bytes'; buffer: Buffer; contentType: string }
  | { kind: 'external'; url: string };

/**
 * Generates one stored image for a `thumbnail_variants` row (OpenRouter image model).
 * Used by {@link ProjectGenerationService} after billing + DB inserts.
 */
@Injectable()
export class ProjectVariantImageService {
  private readonly logger = new Logger(ProjectVariantImageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly openRouter: OpenRouterClient,
  ) {}

  async generateThumbnailForProject(params: {
    projectId: string;
    userId: string;
    variantId: string;
    templateId?: string;
  }): Promise<GenerateThumbnailResult> {
    const client = this.supabase.getAdminClient();
    const { data: project, error: pErr } = await client
      .from('projects')
      .select('*')
      .eq('id', params.projectId)
      .eq('user_id', params.userId)
      .single();

    if (pErr || !project) {
      return {
        variantId: params.variantId,
        imageUrl: null,
        status: 'failed',
        errorMessage: 'Project not found',
      };
    }

    const prompt = this.buildPrompt(project, params.templateId);
    this.logger.log(`Generating variant ${params.variantId} via OpenRouter`);

    let generated: GeneratedImage;
    try {
      generated = await this.resolveGeneratedImage(prompt, params.variantId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Image generation failed';
      this.logger.warn(msg);
      await client
        .from('thumbnail_variants')
        .update({ status: 'failed', error_message: msg })
        .eq('id', params.variantId);
      return {
        variantId: params.variantId,
        imageUrl: null,
        status: 'failed',
        errorMessage: msg,
      };
    }

    try {
      if (generated.kind === 'bytes') {
        const { path } = await this.storage.uploadProjectVariantImage({
          userId: params.userId,
          projectId: params.projectId,
          variantId: params.variantId,
          body: generated.buffer,
          contentType: generated.contentType,
        });
        const signed = await this.storage.createSignedUrl(BUCKET_PROJECT_THUMBNAILS, path);
        await client
          .from('thumbnail_variants')
          .update({
            generated_image_storage_path: path,
            generated_image_url: null,
            status: 'done',
            error_message: null,
          })
          .eq('id', params.variantId);
        return {
          variantId: params.variantId,
          imageUrl: signed,
          storagePath: path,
          status: 'done',
        };
      }

      await client
        .from('thumbnail_variants')
        .update({
          generated_image_storage_path: null,
          generated_image_url: generated.url,
          status: 'done',
          error_message: null,
        })
        .eq('id', params.variantId);
      return {
        variantId: params.variantId,
        imageUrl: generated.url,
        storagePath: null,
        status: 'done',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Storage failed';
      this.logger.warn(msg);
      await client
        .from('thumbnail_variants')
        .update({ status: 'failed', error_message: msg })
        .eq('id', params.variantId);
      return {
        variantId: params.variantId,
        imageUrl: null,
        status: 'failed',
        errorMessage: msg,
      };
    }
  }

  private buildPrompt(project: Record<string, unknown>, templateId?: string): string {
    const title = String(project.title ?? 'Video');
    const sourceType = String(project.source_type ?? 'text');
    const sourceData = (project.source_data as Record<string, unknown>) ?? {};
    const excerpt =
      typeof sourceData.text === 'string'
        ? sourceData.text.slice(0, 500)
        : typeof sourceData.script === 'string'
          ? sourceData.script.slice(0, 500)
          : typeof sourceData.url === 'string'
            ? `YouTube: ${sourceData.url}`
            : JSON.stringify(sourceData).slice(0, 500);
    const tpl = templateId ? ` Template hint: ${templateId}.` : '';
    return `YouTube thumbnail, bold readable title, high contrast, no small text, subject: "${title}". Source (${sourceType}): ${excerpt}.${tpl}`;
  }

  private async resolveGeneratedImage(prompt: string, variantId: string): Promise<GeneratedImage> {
    if (!this.openRouter.getApiKey()) {
      return { kind: 'external', url: this.placeholderThumbnailUrl(variantId) };
    }

    const or = getOpenRouterConfig(this.config);
    const model = or.imageModel;

    const fullPrompt = `YouTube thumbnail 16:9, professional, bold readable title text, high contrast. ${prompt.slice(0, 2000)}`;

    const messages: OpenRouterMessage[] = [{ role: 'user', content: fullPrompt }];

    const timeoutMs = or.projectGenTimeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let result;
    try {
      result = await this.openRouter.chatCompletions({
        model,
        messages,
        modalities: ['image', 'text'],
        temperature: 0.5,
        maxTokens: 8192,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`OpenRouter image gen: request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const imgs = this.openRouter.extractImagesFromParts(result.contentParts);
    if (imgs.length === 0) {
      this.logger.warn(`OpenRouter: no image in response for variant ${variantId}`);
      throw new Error('OpenRouter: no image bytes in response');
    }

    const first = imgs[0];
    const buffer = Buffer.from(first.base64, 'base64');
    if (!buffer.length) {
      throw new Error('OpenRouter: empty image buffer');
    }
    const contentType = first.mime.includes('jpeg') ? 'image/jpeg' : 'image/png';
    return { kind: 'bytes', buffer, contentType };
  }

  private placeholderThumbnailUrl(variantId: string): string {
    const short = variantId.replace(/-/g, '').slice(0, 12) || 'preview';
    const text = encodeURIComponent(`Preview ${short}`);
    return `https://dummyimage.com/1280x720/252529/ff3b3b.png&text=${text}`;
  }
}
