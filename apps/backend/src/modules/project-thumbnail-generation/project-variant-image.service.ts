import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PIPELINE_STEP_MODELS } from '../../config/openrouter-models';
import { getOpenRouterConfig } from '../../config/openrouter.config';
import {
  type ThumbnailFaceInImage,
  THUMBNAIL_PROMPT_QUALITY_GUARDRAILS,
  resolveFaceInThumbnailInstruction,
  resolveThumbnailStyleInstruction,
} from '../../common/thumbnail-prompt-guidelines';
import { userContentTextThenReferenceImages } from '../openrouter/multipart-user-content';
import { OpenRouterClient } from '../openrouter/openrouter.client';
import { requestOpenRouterSingleThumbnailImage } from '../openrouter/openrouter-requests';
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

type YoutubeVideoMeta = {
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  source: 'source_data' | 'oembed';
};

const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;
const YOUTUBE_OEMBED_TIMEOUT_MS = 4500;

/**
 * Generates one stored image for a `thumbnail_variants` row (OpenRouter image model).
 * Used by {@link ProjectGenerationService} after billing + DB inserts.
 */
@Injectable()
export class ProjectVariantImageService {
  private readonly logger = new Logger(ProjectVariantImageService.name);
  private readonly youtubeMetaCache = new Map<string, YoutubeVideoMeta | null>();

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
    private readonly openRouter: OpenRouterClient,
    private readonly templates: TemplatesService,
  ) {}

  /** Loads template + avatar images as data URLs for multimodal image generation. */
  async resolveReferenceDataUrlsForUser(params: {
    userId: string;
    templateId?: string;
    avatarId?: string;
    logContext?: string;
  }): Promise<{
    dataUrls: string[];
    hasTemplateImage: boolean;
    hasAvatarImage: boolean;
  }> {
    const logCtx = params.logContext ?? 'refs';
    const client = this.supabase.getAdminClient();
    const dataUrls: string[] = [];
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
              `Template image too large (${buffer.length}b) for ${logCtx}, skipping reference`,
            );
          } else {
            dataUrls.push(this.bufferToDataUrl(contentType, buffer));
            hasTemplateImage = true;
          }
        } else {
          this.logger.warn(`Template id not resolved (${logCtx}): ${params.templateId}`);
        }
      } catch (e) {
        this.logger.warn(
          `Template reference load failed (${logCtx}): ${e instanceof Error ? e.message : e}`,
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
          this.logger.warn(`Avatar not found for user (${logCtx}): ${params.avatarId}`);
        } else {
          const { buffer, contentType } = await this.storage.downloadObject(
            BUCKET_USER_AVATARS,
            av.storage_path as string,
          );
          if (buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
            this.logger.warn(
              `Avatar image too large (${buffer.length}b) for ${logCtx}, skipping reference`,
            );
          } else {
            const mime = (av.mime_type as string) || contentType;
            dataUrls.push(this.bufferToDataUrl(mime, buffer));
            hasAvatarImage = true;
          }
        }
      } catch (e) {
        this.logger.warn(
          `Avatar reference load failed (${logCtx}): ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    return { dataUrls, hasTemplateImage, hasAvatarImage };
  }

  async generateThumbnailForProject(params: {
    projectId: string;
    userId: string;
    variantId: string;
    templateId?: string;
    avatarId?: string;
    prioritizeFace?: boolean;
    faceInThumbnail?: ThumbnailFaceInImage;
    styleVariantIndex?: number;
    totalVariants?: number;
  }): Promise<GenerateThumbnailResult> {
    const client = this.supabase.getAdminClient();
    const faceInThumbnail: ThumbnailFaceInImage = params.faceInThumbnail ?? 'default';
    const omitFaceRef = faceInThumbnail === 'faceless';
    const effectiveAvatarId = omitFaceRef ? undefined : params.avatarId;
    const effectivePrioritize = omitFaceRef ? false : Boolean(params.prioritizeFace);

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

    const {
      dataUrls: refImages,
      hasTemplateImage,
      hasAvatarImage,
    } = await this.resolveReferenceDataUrlsForUser({
      userId: params.userId,
      templateId: params.templateId,
      avatarId: effectiveAvatarId,
      logContext: `variant ${params.variantId}`,
    });

    const prompt = await this.buildPrompt(
      project as Record<string, unknown>,
      params.projectId,
      params.templateId,
      {
        hasTemplateImage,
        hasAvatarImage,
        prioritizeFace: effectivePrioritize && hasAvatarImage,
      },
      faceInThumbnail,
      params.styleVariantIndex,
      params.totalVariants,
    );
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

  private async buildPrompt(
    project: Record<string, unknown>,
    projectId: string,
    templateId: string | undefined,
    refs: {
      hasTemplateImage: boolean;
      hasAvatarImage: boolean;
      prioritizeFace: boolean;
    },
    faceInThumbnail: ThumbnailFaceInImage,
    styleVariantIndex?: number,
    totalVariants?: number,
  ): Promise<string> {
    const title = String(project.title ?? 'Video');
    const sourceType = String(project.source_type ?? 'text');
    const sourceData = (project.source_data as Record<string, unknown>) ?? {};
    const excerpt = this.buildSourceExcerpt(sourceType, sourceData, projectId);
    const faceModeLine = resolveFaceInThumbnailInstruction(faceInThumbnail);

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

    const styleVariantLine =
      styleVariantIndex === undefined
        ? ''
        : ` ${resolveThumbnailStyleInstruction(undefined, styleVariantIndex)} Variation ${styleVariantIndex + 1}${typeof totalVariants === 'number' ? ` of ${totalVariants}` : ''}; keep output distinct from other variations.`;

    return [
      `YouTube thumbnail concept for topic "${title}".`,
      THUMBNAIL_PROMPT_QUALITY_GUARDRAILS,
      faceModeLine,
      styleVariantLine.trim(),
      `Source context (${sourceType}): ${await excerpt}.`,
      templateText.trim(),
      faceText.trim(),
    ]
      .filter(Boolean)
      .join(' ');
  }

  private async buildSourceExcerpt(
    sourceType: string,
    sourceData: Record<string, unknown>,
    projectId: string,
  ): Promise<string> {
    if (typeof sourceData.text === 'string') {
      return sourceData.text.slice(0, 500);
    }
    if (typeof sourceData.script === 'string') {
      return sourceData.script.slice(0, 500);
    }
    const sourceUrl =
      typeof sourceData.video_url === 'string'
        ? sourceData.video_url
        : typeof sourceData.url === 'string'
          ? sourceData.url
          : null;

    if (!sourceUrl) {
      return JSON.stringify(sourceData).slice(0, 500);
    }

    const url = sourceUrl;
    if (sourceType !== 'youtube_url') {
      return `URL: ${url}`;
    }

    const meta = await this.resolveYoutubeVideoMeta(url, sourceData, projectId);
    if (!meta) {
      return `YouTube URL: ${url}`;
    }

    const parts: string[] = [];
    if (meta.title) parts.push(`title "${meta.title}"`);
    if (meta.author) parts.push(`channel "${meta.author}"`);
    if (meta.thumbnailUrl) parts.push(`thumbnail ${meta.thumbnailUrl}`);
    parts.push(`url ${url}`);
    return `YouTube metadata: ${parts.join(', ')}`;
  }

  private async resolveYoutubeVideoMeta(
    videoUrl: string,
    sourceData: Record<string, unknown>,
    projectId: string,
  ): Promise<YoutubeVideoMeta | null> {
    const fromSourceData = this.extractMetaFromSourceData(sourceData);
    if (fromSourceData) {
      return fromSourceData;
    }

    if (this.youtubeMetaCache.has(projectId)) {
      return this.youtubeMetaCache.get(projectId) ?? null;
    }

    const fetched = await this.fetchYoutubeOembedMeta(videoUrl);
    this.youtubeMetaCache.set(projectId, fetched);
    return fetched;
  }

  private extractMetaFromSourceData(sourceData: Record<string, unknown>): YoutubeVideoMeta | null {
    const raw = sourceData.video_meta;
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const obj = raw as Record<string, unknown>;
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const author = typeof obj.author === 'string' ? obj.author.trim() : '';
    const thumbnailUrl = typeof obj.thumbnail === 'string' ? obj.thumbnail.trim() : '';
    if (!title && !author && !thumbnailUrl) {
      return null;
    }
    return {
      title: title || undefined,
      author: author || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      source: 'source_data',
    };
  }

  private async fetchYoutubeOembedMeta(videoUrl: string): Promise<YoutubeVideoMeta | null> {
    let oembedUrl: string;
    try {
      const encoded = encodeURIComponent(videoUrl);
      oembedUrl = `https://www.youtube.com/oembed?url=${encoded}&format=json`;
    } catch {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), YOUTUBE_OEMBED_TIMEOUT_MS);
    try {
      const res = await fetch(oembedUrl, { signal: controller.signal });
      if (!res.ok) {
        this.logger.warn(`YouTube oEmbed request failed: ${res.status}`);
        return null;
      }
      const json = (await res.json()) as Record<string, unknown>;
      const title = typeof json.title === 'string' ? json.title.trim() : '';
      const author = typeof json.author_name === 'string' ? json.author_name.trim() : '';
      const thumbnailUrl = typeof json.thumbnail_url === 'string' ? json.thumbnail_url.trim() : '';
      if (!title && !author && !thumbnailUrl) {
        return null;
      }
      return {
        title: title || undefined,
        author: author || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        source: 'oembed',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`YouTube oEmbed fetch failed: ${msg}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
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
    const model = PIPELINE_STEP_MODELS.imageGeneration;

    const header =
      'Generate a single 16:9 YouTube thumbnail image. After this paragraph, reference images appear in order (template first, then face if present).';
    const fullPrompt = `${header}\n\n${opts.prompt.slice(0, 2500)}`;

    const content =
      opts.referenceDataUrls.length > 0
        ? userContentTextThenReferenceImages(fullPrompt, opts.referenceDataUrls)
        : fullPrompt;

    const messages: OpenRouterMessage[] = [{ role: 'user', content }];

    const timeoutMs = or.projectGenTimeoutMs;
    const img = await requestOpenRouterSingleThumbnailImage({
      openRouter: this.openRouter,
      model,
      messages,
      timeoutMs,
      logger: this.logger,
      logContext: `project variant ${opts.variantId}`,
    });
    if (!img) {
      this.logger.warn(`OpenRouter: no image in response for variant ${opts.variantId}`);
      throw new Error('OpenRouter: no image bytes in response');
    }
    return { kind: 'bytes', buffer: img.buffer, contentType: img.contentType };
  }

  private placeholderThumbnailUrl(variantId: string): string {
    const short = variantId.replace(/-/g, '').slice(0, 12) || 'preview';
    const text = encodeURIComponent(`Preview ${short}`);
    return `https://dummyimage.com/1280x720/252529/ff3b3b.png&text=${text}`;
  }
}
