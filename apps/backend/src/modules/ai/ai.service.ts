import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

type ImagenPrediction = {
  bytesBase64Encoded?: string;
  bytes_base64_encoded?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeneratedImage =
  | { kind: 'bytes'; buffer: Buffer; contentType: string }
  | { kind: 'external'; url: string };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly storage: StorageService,
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
    this.logger.log(`Generating variant ${params.variantId} via Gemini (Imagen)`);

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
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      return { kind: 'external', url: this.placeholderThumbnailUrl(variantId) };
    }

    const model =
      this.config.get<string>('GEMINI_IMAGEN_MODEL')?.trim() || 'imagen-4.0-fast-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

    const controller = new AbortController();
    const imagenTimeoutMs =
      Number(this.config.get<string>('GEMINI_IMAGEN_TIMEOUT_MS')) || 120_000;
    const timeout = setTimeout(() => controller.abort(), imagenTimeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: prompt.slice(0, 2000) }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
          },
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Gemini Imagen: request timed out after ${imagenTimeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await res.text();
    if (!res.ok) {
      let detail = rawText;
      try {
        const errJson = JSON.parse(rawText) as { error?: { message?: string } };
        if (errJson.error?.message) detail = errJson.error.message;
      } catch {
        /* keep raw */
      }
      throw new Error(`Gemini Imagen: ${res.status} ${detail}`);
    }

    let json: unknown;
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      throw new Error('Gemini Imagen: invalid JSON response');
    }

    const decoded = this.extractImagenImageBytes(json);
    if (decoded) {
      return {
        kind: 'bytes',
        buffer: decoded.buffer,
        contentType: decoded.contentType,
      };
    }

    this.logger.warn(`Unexpected Imagen response keys: ${this.jsonTopKeys(json)}`);
    throw new Error('Gemini Imagen: no image bytes in response');
  }

  private extractImagenImageBytes(json: unknown): { buffer: Buffer; contentType: string } | null {
    const root = json as Record<string, unknown>;

    const predictions = root.predictions as ImagenPrediction[] | undefined;
    if (Array.isArray(predictions) && predictions.length > 0) {
      const b = this.predictionToBytes(predictions[0]);
      if (b) return b;
    }

    const generatedImages = root.generatedImages as unknown[] | undefined;
    if (Array.isArray(generatedImages) && generatedImages.length > 0) {
      const first = generatedImages[0] as Record<string, unknown>;
      const image = first.image as Record<string, unknown> | undefined;
      const b64 =
        (image?.imageBytes as string | undefined) ||
        (image?.image_bytes as string | undefined);
      if (typeof b64 === 'string' && b64.length > 0) {
        const mime =
          (image?.mimeType as string) || (image?.mime_type as string) || 'image/png';
        const buffer = Buffer.from(b64, 'base64');
        if (buffer.length) return { buffer, contentType: mime };
      }
    }

    return null;
  }

  private predictionToBytes(p: ImagenPrediction): { buffer: Buffer; contentType: string } | null {
    const b64 = p.bytesBase64Encoded ?? p.bytes_base64_encoded;
    if (typeof b64 !== 'string' || !b64.length) return null;
    const mime = p.mimeType ?? p.mime_type ?? 'image/png';
    const buffer = Buffer.from(b64, 'base64');
    if (!buffer.length) return null;
    return { buffer, contentType: mime };
  }

  private jsonTopKeys(json: unknown): string {
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return Object.keys(json as object).join(', ');
    }
    return typeof json;
  }

  private placeholderThumbnailUrl(variantId: string): string {
    const short = variantId.replace(/-/g, '').slice(0, 12) || 'preview';
    const text = encodeURIComponent(`Preview ${short}`);
    return `https://dummyimage.com/1280x720/252529/ff3b3b.png&text=${text}`;
  }
}
