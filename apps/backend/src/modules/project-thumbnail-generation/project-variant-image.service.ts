import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import { userContentTextThenReferenceImages } from '../openrouter/multipart-user-content';
import { OpenRouterClient } from '../openrouter/openrouter.client';
import type { OpenRouterMessage } from '../openrouter/openrouter.types';
import { SupabaseService } from '../supabase/supabase.service';
import { TemplatesService } from '../templates/templates.service';
import {
  BUCKET_PROJECT_THUMBNAILS,
  BUCKET_THUMBNAIL_TEMPLATES,
  BUCKET_USER_AVATARS,
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

const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;

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
    private readonly templates: TemplatesService,
  ) {}

  async generateThumbnailForProject(params: {
    projectId: string;
    userId: string;
    variantId: string;
    templateId?: string;
    avatarId?: string;
    prioritizeFace?: boolean;
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

    const refImages: string[] = [];
    let hasTemplateImage = false;
    let hasAvatarImage = false;

    if (params.templateId?.trim()) {
      try {
        const resolved = await this.templates.resolveTemplateForGeneration(
          params.userId,
          params.templateId.trim(),
        );
        if (resolved) {
          const { buffer, contentType } = await this.storage.downloadObject(
            BUCKET_THUMBNAIL_TEMPLATES,
            resolved.storagePath,
          );
          if (buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
            this.logger.warn(
              `Template image too large (${buffer.length}b) for variant ${params.variantId}, skipping reference`,
            );
          } else {
            refImages.push(this.bufferToDataUrl(contentType, buffer));
            hasTemplateImage = true;
          }
        } else {
          this.logger.warn(`Template id not resolved: ${params.templateId}`);
        }
      } catch (e) {
        this.logger.warn(
          `Template reference load failed for ${params.variantId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    if (params.avatarId?.trim()) {
      try {
        const { data: av, error: avErr } = await client
          .from('user_avatars')
          .select('storage_path, mime_type')
          .eq('id', params.avatarId.trim())
          .eq('user_id', params.userId)
          .maybeSingle();
        if (avErr || !av?.storage_path) {
          this.logger.warn(`Avatar not found for user: ${params.avatarId}`);
        } else {
          const { buffer, contentType } = await this.storage.downloadObject(
            BUCKET_USER_AVATARS,
            av.storage_path as string,
          );
          if (buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
            this.logger.warn(
              `Avatar image too large (${buffer.length}b) for variant ${params.variantId}, skipping reference`,
            );
          } else {
            const mime = (av.mime_type as string) || contentType;
            refImages.push(this.bufferToDataUrl(mime, buffer));
            hasAvatarImage = true;
          }
        }
      } catch (e) {
        this.logger.warn(
          `Avatar reference load failed for ${params.variantId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    const prompt = this.buildPrompt(project as Record<string, unknown>, params.templateId, {
      hasTemplateImage,
      hasAvatarImage,
      prioritizeFace: Boolean(params.prioritizeFace) && hasAvatarImage,
    });
    this.logger.log(`Generating variant ${params.variantId} via OpenRouter (refs: ${refImages.length})`);

    let generated: GeneratedImage;
    try {
      generated = await this.resolveGeneratedImage({
        prompt,
        variantId: params.variantId,
        referenceDataUrls: refImages,
      });
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

  private buildPrompt(
    project: Record<string, unknown>,
    templateId: string | undefined,
    refs: {
      hasTemplateImage: boolean;
      hasAvatarImage: boolean;
      prioritizeFace: boolean;
    },
  ): string {
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

    const templateText =
      templateId && !refs.hasTemplateImage
        ? ` Template catalog id (no image resolved): ${templateId}.`
        : refs.hasTemplateImage
          ? ' The first attached image is a layout/style template: match composition, safe margins, typography energy, and overall structure; adapt colors to fit the topic.'
          : '';

    const faceText =
      refs.hasAvatarImage && refs.hasTemplateImage
        ? refs.prioritizeFace
          ? ' The image after the template is the on-camera person: prioritize a recognizable likeness (face, hair, skin tone). They should be the main human subject.'
          : ' The image after the template is a face reference for the main person; keep them recognizable and well-lit.'
        : refs.hasAvatarImage
          ? refs.prioritizeFace
            ? ' The attached image is the on-camera person: prioritize a recognizable likeness; they should be the main human subject.'
            : ' The attached image is a face reference for the main person; keep them recognizable and well-lit.'
          : '';

    return `YouTube thumbnail, bold readable title, high contrast, no small text, subject: "${title}". Source (${sourceType}): ${excerpt}.${templateText}${faceText}`;
  }

  private bufferToDataUrl(contentType: string, buffer: Buffer): string {
    const mime = contentType.split(';')[0].trim().toLowerCase();
    const normalized = mime === 'image/jpg' ? 'image/jpeg' : mime;
    return `data:${normalized};base64,${buffer.toString('base64')}`;
  }

  private async resolveGeneratedImage(opts: {
    prompt: string;
    variantId: string;
    referenceDataUrls: string[];
  }): Promise<GeneratedImage> {
    if (!this.openRouter.getApiKey()) {
      return { kind: 'external', url: this.placeholderThumbnailUrl(opts.variantId) };
    }

    const or = getOpenRouterConfig(this.config);
    const model = or.imageModel;

    const header =
      'Generate a single 16:9 YouTube thumbnail image. After this paragraph, reference images appear in order (template first, then face if present).';
    const fullPrompt = `${header}\n\n${opts.prompt.slice(0, 2500)}`;

    const content =
      opts.referenceDataUrls.length > 0
        ? userContentTextThenReferenceImages(fullPrompt, opts.referenceDataUrls)
        : fullPrompt;

    const messages: OpenRouterMessage[] = [{ role: 'user', content }];

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
      this.logger.warn(`OpenRouter: no image in response for variant ${opts.variantId}`);
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
