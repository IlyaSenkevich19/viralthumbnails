import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export interface GenerateThumbnailResult {
  variantId: string;
  imageUrl: string | null;
  status: 'done' | 'failed';
  errorMessage?: string;
}

type ImagenPrediction = {
  bytesBase64Encoded?: string;
  bytes_base64_encoded?: string;
  mimeType?: string;
  mime_type?: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
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

    let imageUrl: string | null = null;
    try {
      imageUrl = await this.generateWithGeminiImagen(prompt, params.variantId);
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

    await client
      .from('thumbnail_variants')
      .update({ generated_image_url: imageUrl, status: 'done', error_message: null })
      .eq('id', params.variantId);

    return { variantId: params.variantId, imageUrl, status: 'done' };
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

  private async generateWithGeminiImagen(prompt: string, variantId: string): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      return this.placeholderThumbnailUrl(variantId);
    }

    const model =
      this.config.get<string>('GEMINI_IMAGEN_MODEL')?.trim() || 'imagen-4.0-fast-generate-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

    const res = await fetch(url, {
      method: 'POST',
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

    const dataUrl = this.extractImagenImageDataUrl(json);
    if (dataUrl) return dataUrl;

    this.logger.warn(`Unexpected Imagen response keys: ${this.jsonTopKeys(json)}`);
    throw new Error('Gemini Imagen: no image bytes in response');
  }

  private extractImagenImageDataUrl(json: unknown): string | null {
    const root = json as Record<string, unknown>;

    const predictions = root.predictions as ImagenPrediction[] | undefined;
    if (Array.isArray(predictions) && predictions.length > 0) {
      const img = this.predictionToDataUrl(predictions[0]);
      if (img) return img;
    }

    const generatedImages = root.generatedImages as unknown[] | undefined;
    if (Array.isArray(generatedImages) && generatedImages.length > 0) {
      const first = generatedImages[0] as Record<string, unknown>;
      const image = first.image as Record<string, unknown> | undefined;
      const bytes =
        (image?.imageBytes as string | undefined) ||
        (image?.image_bytes as string | undefined);
      if (typeof bytes === 'string' && bytes.length > 0) {
        const mime = (image?.mimeType as string) || (image?.mime_type as string) || 'image/png';
        return `data:${mime};base64,${bytes}`;
      }
    }

    return null;
  }

  private predictionToDataUrl(p: ImagenPrediction): string | null {
    const b64 = p.bytesBase64Encoded ?? p.bytes_base64_encoded;
    if (typeof b64 !== 'string' || !b64.length) return null;
    const mime = p.mimeType ?? p.mime_type ?? 'image/png';
    return `data:${mime};base64,${b64}`;
  }

  private jsonTopKeys(json: unknown): string {
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return Object.keys(json as object).join(', ');
    }
    return typeof json;
  }

  /**
   * Fallback when GEMINI_API_KEY is not set (local dev / geo / billing).
   */
  private placeholderThumbnailUrl(variantId: string): string {
    const short = variantId.replace(/-/g, '').slice(0, 12) || 'preview';
    const text = encodeURIComponent(`Preview ${short}`);
    return `https://dummyimage.com/1280x720/252529/ff3b3b.png&text=${text}`;
  }
}
